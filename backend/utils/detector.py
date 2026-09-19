import os
import cv2
import logging
import urllib.request
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Path to store the downloaded model file
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"

# Minimum valid model file size (bytes) to catch corrupt/partial downloads
MIN_MODEL_SIZE = 1_000_000  # ~1 MB (actual model is ~3.5 MB)


def _ensure_model():
    """Download the FaceLandmarker model if it doesn't exist or is corrupted."""
    if os.path.exists(MODEL_PATH):
        file_size = os.path.getsize(MODEL_PATH)
        if file_size >= MIN_MODEL_SIZE:
            logger.debug("FaceLandmarker model found at %s (%d bytes)", MODEL_PATH, file_size)
            return
        else:
            logger.warning("Model file appears corrupted (%d bytes). Re-downloading...", file_size)
            os.remove(MODEL_PATH)

    os.makedirs(MODEL_DIR, exist_ok=True)
    logger.info("Downloading FaceLandmarker model to %s ...", MODEL_PATH)
    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        file_size = os.path.getsize(MODEL_PATH)
        if file_size < MIN_MODEL_SIZE:
            raise RuntimeError(f"Downloaded model is too small ({file_size} bytes), likely corrupted")
        logger.info("Model download complete (%d bytes).", file_size)
    except Exception as e:
        # Clean up partial downloads
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        logger.error("Failed to download FaceLandmarker model: %s", e)
        raise RuntimeError(
            f"Could not download the MediaPipe FaceLandmarker model from {MODEL_URL}. "
            f"Check your internet connection and try again. Error: {e}"
        ) from e


class EyeDetector:
    """
    OpenCV & Mediapipe Face Mesh Wrapper for Real-Time Eye Landmark Detection.
    Uses the MediaPipe Tasks API (FaceLandmarker) for accurate 468-point face mesh tracking.
    """

    def __init__(self, max_num_faces=1, min_detection_confidence=0.7, min_tracking_confidence=0.7):
        _ensure_model()

        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_faces=max_num_faces,
            min_face_detection_confidence=min_detection_confidence,
            min_face_presence_confidence=min_tracking_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)
        self._frame_timestamp_ms = 0
        self._initialized = True

        # Landmark indices for Left and Right Eye (Mediapipe FaceMesh)
        # Left eye indices: P1, P2, P3, P4, P5, P6
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        # Right eye indices: P1, P2, P3, P4, P5, P6
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]

        logger.info("EyeDetector initialized successfully (FaceLandmarker ready)")

    @property
    def is_ready(self):
        """Check if the detector is properly initialized and ready for processing."""
        return getattr(self, '_initialized', False)

    def process_frame(self, frame):
        """
        Processes a BGR image frame and extracts left and right eye landmarks.
        
        Returns:
            tuple: (left_eye_coords, right_eye_coords, face_landmarks)
                   Each eye coords is a list of (x, y) pixel tuples.
                   Returns empty lists if no face is detected.
        """
        ih, iw, _ = frame.shape
        left_eye_coords = []
        right_eye_coords = []

        try:
            # Convert BGR to RGB for Mediapipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # Advance the timestamp for VIDEO mode
            self._frame_timestamp_ms += 33  # ~30 fps
            results = self.landmarker.detect_for_video(mp_image, self._frame_timestamp_ms)

            if results.face_landmarks:
                for face_landmarks in results.face_landmarks:
                    # Extract Left Eye coordinates
                    for idx in self.LEFT_EYE:
                        lm = face_landmarks[idx]
                        left_eye_coords.append((int(lm.x * iw), int(lm.y * ih)))

                    # Extract Right Eye coordinates
                    for idx in self.RIGHT_EYE:
                        lm = face_landmarks[idx]
                        right_eye_coords.append((int(lm.x * iw), int(lm.y * ih)))

            return left_eye_coords, right_eye_coords, results.face_landmarks

        except Exception as e:
            logger.error("Frame processing failed: %s", e)
            return [], [], None

    def draw_landmarks(self, frame, left_eye, right_eye, status="Open", ear=0.0):
        """
        Draws eye contours and displays real-time EAR metrics on the OpenCV frame.
        """
        # Draw eye contours
        if len(left_eye) > 0:
            pts_left = np.array(left_eye, np.int32).reshape((-1, 1, 2))
            cv2.polylines(frame, [pts_left], True, (0, 255, 255), 2)

        if len(right_eye) > 0:
            pts_right = np.array(right_eye, np.int32).reshape((-1, 1, 2))
            cv2.polylines(frame, [pts_right], True, (0, 255, 255), 2)

        # Overlay HUD info
        color = (0, 255, 0) if status == "Open" else (0, 0, 255)
        cv2.putText(frame, f"EAR: {ear:.2f}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Status: {status}", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        return frame

    def release(self):
        """Release the FaceLandmarker resources."""
        try:
            self.landmarker.close()
            self._initialized = False
            logger.info("EyeDetector released successfully")
        except Exception as e:
            logger.warning("Error releasing EyeDetector: %s", e)
