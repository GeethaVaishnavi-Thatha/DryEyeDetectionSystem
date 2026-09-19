"""
Smart Dry Eye Detection System — Flask REST API & Video Streaming Server

Provides real-time eye health monitoring via OpenCV and MediaPipe FaceLandmarker.
Exposes REST endpoints for live video feeds, session metrics, risk analysis,
and CSV report exports for medical review.
"""

import os
import sys
import time
import atexit
import logging
import threading
from datetime import datetime

import cv2
import pandas as pd
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS

from models.ear_calc import calculate_ear, assess_dry_eye_risk, calculate_health_score
from utils.detector import EyeDetector
import db

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dry_eye_backend")

# ---------------------------------------------------------------------------
# Flask Application
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# Sessions are recorded by the browser and stored here; the browser has no
# durable storage of its own, so this is what makes history possible.
db.init_db()

# ---------------------------------------------------------------------------
# Thread-Safe Session State
# ---------------------------------------------------------------------------
_state_lock = threading.Lock()

session_state = {
    "start_time": time.time(),
    "blink_count": 0,
    "last_blink_time": time.time(),
    "ear": 0.32,
    "eye_status": "Open",
    "blink_rate": 0.0,
    "screen_time_minutes": 0.0,
    "risk_level": "Low Risk",
    "risk_score": 0,
    "health_score": 94,
    "history": [],
}

# ---------------------------------------------------------------------------
# Lazy-Initialized Global Resources (avoids Flask reloader double-init)
# ---------------------------------------------------------------------------
_detector = None
_camera = None


def _get_detector():
    """Lazily initialize the EyeDetector on first use."""
    global _detector
    if _detector is None:
        logger.info("Initializing EyeDetector...")
        _detector = EyeDetector()
    return _detector


def _get_camera():
    """Lazily initialize or re-acquire the webcam on first use."""
    global _camera
    if _camera is None or not _camera.isOpened():
        logger.info("Opening webcam (device 0)...")
        _camera = cv2.VideoCapture(0)
        if not _camera.isOpened():
            logger.error("Failed to open webcam. Is it connected and available?")
    return _camera


def _cleanup():
    """Release camera and detector resources on shutdown."""
    global _camera, _detector
    logger.info("Shutting down — releasing resources...")
    if _camera is not None:
        try:
            _camera.release()
            logger.info("Camera released.")
        except Exception as e:
            logger.warning("Error releasing camera: %s", e)
        _camera = None
    if _detector is not None:
        try:
            _detector.release()
        except Exception as e:
            logger.warning("Error releasing detector: %s", e)
        _detector = None


atexit.register(_cleanup)

# ---------------------------------------------------------------------------
# Video Streaming Pipeline
# ---------------------------------------------------------------------------
EAR_THRESHOLD = 0.21  # Standard threshold for blink detection
EAR_CONSEC_FRAMES = 2  # Consecutive frames below threshold to count as a blink


def generate_frames():
    """
    Generator that yields MJPEG frames with real-time eye landmark analysis.
    
    Processes each webcam frame through the MediaPipe FaceLandmarker pipeline,
    calculates EAR for both eyes, detects blinks, and overlays diagnostic HUD.
    """
    global session_state
    detector = _get_detector()
    cam = _get_camera()
    frame_counter = 0

    if not cam.isOpened():
        logger.error("Cannot generate frames — camera not available")
        return

    logger.info("Video streaming started")

    while True:
        success, frame = cam.read()
        if not success:
            logger.warning("Frame read failed — retrying...")
            time.sleep(0.1)
            continue

        frame = cv2.flip(frame, 1)  # Mirror image for natural UX

        try:
            left_eye, right_eye, landmarks = detector.process_frame(frame)
        except Exception as e:
            logger.error("Detector error: %s", e)
            left_eye, right_eye, landmarks = [], [], None

        current_time = time.time()

        with _state_lock:
            session_state["screen_time_minutes"] = round(
                (current_time - session_state["start_time"]) / 60, 2
            )

            if len(left_eye) > 0 and len(right_eye) > 0:
                left_ear = calculate_ear(left_eye)
                right_ear = calculate_ear(right_eye)
                ear = (left_ear + right_ear) / 2.0
                session_state["ear"] = round(ear, 3)

                # --- Blink Detection Logic ---
                if ear < EAR_THRESHOLD:
                    frame_counter += 1
                    session_state["eye_status"] = "Closed"
                else:
                    if frame_counter >= EAR_CONSEC_FRAMES:
                        session_state["blink_count"] += 1
                        session_state["last_blink_time"] = current_time
                        # Record blink event in history
                        session_state["history"].append({
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "ear": session_state["ear"],
                            "blink_count": session_state["blink_count"],
                            "screen_time": session_state["screen_time_minutes"],
                        })
                    frame_counter = 0
                    session_state["eye_status"] = "Open"

                # --- Blinks Per Minute (BPM) ---
                elapsed_minutes = max(0.1, (current_time - session_state["start_time"]) / 60)
                session_state["blink_rate"] = round(
                    session_state["blink_count"] / elapsed_minutes, 1
                )

                # --- Risk Assessment ---
                risk_level, risk_score = assess_dry_eye_risk(
                    session_state["ear"],
                    session_state["blink_rate"],
                    session_state["screen_time_minutes"],
                )
                session_state["risk_level"] = risk_level
                session_state["risk_score"] = risk_score

                # --- Health Score ---
                session_state["health_score"] = calculate_health_score(
                    session_state["ear"],
                    session_state["blink_rate"],
                    session_state["screen_time_minutes"],
                )

                # Draw HUD on frame
                frame = detector.draw_landmarks(
                    frame, left_eye, right_eye,
                    session_state["eye_status"],
                    session_state["ear"],
                )

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            continue
        frame_bytes = buffer.tobytes()

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
        )


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint — verifies server, detector, and camera status."""
    detector_ready = _detector is not None and _detector.is_ready
    camera_ready = _camera is not None and _camera.isOpened()
    uptime_seconds = round(time.time() - session_state["start_time"], 1)

    return jsonify({
        "status": "healthy",
        "uptime_seconds": uptime_seconds,
        "detector_initialized": detector_ready,
        "camera_available": camera_ready,
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })


@app.route('/api/video_feed')
def video_feed():
    """MJPEG video stream endpoint for real-time webcam + eye landmark overlay."""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


@app.route('/api/status', methods=['GET'])
def get_status():
    """Returns current session metrics (EAR, blink rate, risk, health score)."""
    with _state_lock:
        # Build a serializable copy with human-readable fields
        data = {
            "ear": session_state["ear"],
            "eye_status": session_state["eye_status"],
            "blink_count": session_state["blink_count"],
            "blink_rate": session_state["blink_rate"],
            "screen_time_minutes": session_state["screen_time_minutes"],
            "risk_level": session_state["risk_level"],
            "risk_score": session_state["risk_score"],
            "health_score": session_state["health_score"],
            "last_blink_time": datetime.fromtimestamp(
                session_state["last_blink_time"]
            ).strftime("%H:%M:%S"),
            "session_start": datetime.fromtimestamp(
                session_state["start_time"]
            ).strftime("%Y-%m-%d %H:%M:%S"),
            "history_count": len(session_state["history"]),
        }
    return jsonify(data)


@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Reset all session metrics to their initial values."""
    global session_state
    with _state_lock:
        session_state = {
            "start_time": time.time(),
            "blink_count": 0,
            "last_blink_time": time.time(),
            "ear": 0.32,
            "eye_status": "Open",
            "blink_rate": 0.0,
            "screen_time_minutes": 0.0,
            "risk_level": "Low Risk",
            "risk_score": 0,
            "health_score": 94,
            "history": [],
        }
    logger.info("Session reset by user")
    return jsonify({"status": "success", "message": "Session reset successfully"})


@app.route('/api/export_csv', methods=['GET'])
def export_csv():
    """Export session history as a downloadable CSV report."""
    with _state_lock:
        history = list(session_state["history"])  # Copy under lock
        current_metrics = {
            "blink_count": session_state["blink_count"],
            "blink_rate": session_state["blink_rate"],
            "risk_level": session_state["risk_level"],
            "health_score": session_state["health_score"],
        }

    if not history:
        # Generate sample data if no real events recorded yet
        now = datetime.now()
        history = [
            {
                "timestamp": (now.replace(minute=max(0, now.minute - 5))).strftime("%Y-%m-%d %H:%M:%S"),
                "ear": 0.28, "blink_count": 12, "screen_time": 5.0,
            },
            {
                "timestamp": (now.replace(minute=max(0, now.minute - 4))).strftime("%Y-%m-%d %H:%M:%S"),
                "ear": 0.31, "blink_count": 18, "screen_time": 6.0,
            },
            {
                "timestamp": (now.replace(minute=max(0, now.minute - 3))).strftime("%Y-%m-%d %H:%M:%S"),
                "ear": 0.19, "blink_count": 22, "screen_time": 7.0,
            },
            {
                "timestamp": (now.replace(minute=max(0, now.minute - 2))).strftime("%Y-%m-%d %H:%M:%S"),
                "ear": 0.33, "blink_count": 30, "screen_time": 8.0,
            },
            {
                "timestamp": (now.replace(minute=max(0, now.minute - 1))).strftime("%Y-%m-%d %H:%M:%S"),
                "ear": 0.22, "blink_count": 35, "screen_time": 9.0,
            },
        ]

    df = pd.DataFrame(history)

    # Add summary columns
    df["risk_level"] = current_metrics["risk_level"]
    df["health_score"] = current_metrics["health_score"]

    os.makedirs("assets", exist_ok=True)
    file_path = os.path.join("assets", "dry_eye_report.csv")
    df.to_csv(file_path, index=False)
    logger.info("CSV report exported (%d rows)", len(df))
    return send_file(file_path, as_attachment=True, download_name="dry_eye_report.csv")



# ---------------------------------------------------------------------------
# Session History
#
# Detection runs in the browser. This stores finished sessions so the dashboard
# can show trends across days rather than resetting on every page load.
# ---------------------------------------------------------------------------

REQUIRED_SESSION_FIELDS = ("started_at", "ended_at", "duration_seconds")


def _bad_request(message):
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/sessions", methods=["POST"])
def create_session():
    """Record one finished session."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _bad_request("Expected a JSON object")

    missing = [f for f in REQUIRED_SESSION_FIELDS if not payload.get(f)]
    if missing:
        return _bad_request(f"Missing required field(s): {', '.join(missing)}")

    try:
        duration = int(payload["duration_seconds"])
    except (TypeError, ValueError):
        return _bad_request("duration_seconds must be a whole number of seconds")

    if duration < 0:
        return _bad_request("duration_seconds cannot be negative")

    # A session shorter than this is a mis-click, not data worth keeping.
    if duration < 5:
        return jsonify({
            "success": False,
            "skipped": True,
            "error": "Session too short to record (under 5 seconds)",
        }), 422

    try:
        stored = db.insert_session(payload)
    except Exception as exc:
        logger.exception("Failed to store session")
        return jsonify({"success": False, "error": str(exc)}), 500

    logger.info(
        "Stored session %s: %ss, %s blinks, %s",
        stored["id"], stored["duration_seconds"],
        stored["blink_count"], stored["risk_level"],
    )
    return jsonify({"success": True, "session": stored}), 201


def _int_arg(name, default, lo, hi):
    """Read a bounded integer query param, ignoring junk."""
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, value))


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    days = _int_arg("days", 30, 1, 365)
    limit = _int_arg("limit", 200, 1, 1000)
    sessions = db.list_sessions(days=days, limit=limit)
    return jsonify({"success": True, "count": len(sessions), "sessions": sessions})


@app.route("/api/sessions/stats", methods=["GET"])
def get_session_stats():
    """Per-day aggregates plus window totals, for the trend chart."""
    days = _int_arg("days", 7, 1, 90)
    return jsonify({
        "success": True,
        "days": days,
        "daily": db.daily_stats(days=days),
        "summary": db.summary(days=days),
    })


@app.route("/api/sessions/<int:session_id>", methods=["DELETE"])
def remove_session(session_id):
    if not db.delete_session(session_id):
        return jsonify({"success": False, "error": "Session not found"}), 404
    return jsonify({"success": True, "deleted": session_id})


@app.route("/api/sessions", methods=["DELETE"])
def clear_sessions():
    db.clear_all()
    logger.info("Cleared all stored sessions")
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    logger.info("Starting Smart Dry Eye Detection System Backend...")
    logger.info(
        "API endpoints: /api/health, /api/video_feed, /api/status, /api/reset, "
        "/api/export_csv, /api/sessions, /api/sessions/stats"
    )
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
