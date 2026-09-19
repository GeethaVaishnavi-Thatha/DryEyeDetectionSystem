import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  BLINK_CONSEC_FRAMES,
  DEFAULT_EAR_THRESHOLD,
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
  calculateEAR,
  thresholdFromBaseline,
  type Point,
} from "../lib/ear";

// Served from jsDelivr so the app needs no build-time asset wiring and works
// on a static host. Pin the version to the installed package.
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** How often detection results are published to React state. The detection loop
 *  itself runs every animation frame; re-rendering at that rate would be wasteful. */
const PUBLISH_INTERVAL_MS = 200;

/** Give the GPU delegate this long to initialise before falling back to CPU. */
const GPU_INIT_TIMEOUT_MS = 8_000;

/** Blink rate is measured over a rolling window rather than since session start,
 *  so it reflects what the user is doing now. */
const BLINK_WINDOW_MS = 60_000;

/** Seconds of open-eye video used to learn the user's personal baseline EAR. */
export const CALIBRATION_SECONDS = 6;

export type ModelState = "idle" | "loading" | "ready" | "error";
export type EyeStatus = "Open" | "Closed" | "Dry Eye Risk";

export interface EyeTrackingResult {
  modelState: ModelState;
  /** Which MediaPipe backend actually initialised. */
  delegate: "GPU" | "CPU" | null;
  errorMessage: string | null;
  faceDetected: boolean;
  ear: number;
  eyeStatus: EyeStatus;
  blinkCount: number;
  blinkRate: number;
  fps: number;
  isCalibrating: boolean;
  calibrationProgress: number;
  baselineEar: number | null;
  earThreshold: number;
  startCalibration: () => void;
  resetSession: () => void;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  /** Flags an incomplete blink pattern so the caller can raise an alert. */
  onDryEyePattern?: () => void;
}

/**
 * Runs MediaPipe FaceLandmarker against the webcam, computes Eye Aspect Ratio
 * from the real landmarks, counts blinks, and draws the eye contours onto the
 * canvas at their actual positions.
 */
export function useEyeTracking({
  videoRef,
  canvasRef,
  enabled,
  onDryEyePattern,
}: Options): EyeTrackingResult {
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [delegate, setDelegate] = useState<"GPU" | "CPU" | null>(null);
  const delegateRef = useRef<"GPU" | "CPU" | null>(null);

  // Published (throttled) view of the detection loop's state.
  const [published, setPublished] = useState({
    faceDetected: false,
    ear: 0,
    eyeStatus: "Open" as EyeStatus,
    blinkCount: 0,
    blinkRate: 0,
    fps: 0,
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baselineEar, setBaselineEar] = useState<number | null>(null);
  const [earThreshold, setEarThreshold] = useState(DEFAULT_EAR_THRESHOLD);

  // Mutable per-frame state. Refs, not state — these change ~60x/second.
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  const closedFramesRef = useRef(0);
  const blinkTimestampsRef = useRef<number[]>([]);
  const blinkCountRef = useRef(0);
  const earRef = useRef(0);
  const faceDetectedRef = useRef(false);
  const statusRef = useRef<EyeStatus>("Open");
  const thresholdRef = useRef(DEFAULT_EAR_THRESHOLD);

  const frameTimesRef = useRef<number[]>([]);

  const calibratingRef = useRef(false);
  const calibrationSamplesRef = useRef<number[]>([]);
  const calibrationStartRef = useRef(0);

  const onDryEyePatternRef = useRef(onDryEyePattern);
  useEffect(() => {
    onDryEyePatternRef.current = onDryEyePattern;
  }, [onDryEyePattern]);

  // ── Load the model once, lazily ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled || landmarkerRef.current) return;

    let cancelled = false;
    setModelState("loading");
    setErrorMessage(null);

    (async () => {
      const create = (fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

        // The GPU delegate can hang indefinitely rather than reject on machines
        // where WebGL reports available but the backend cannot actually
        // initialise. Race it so a stall falls back to CPU instead of leaving
        // the user on a spinner forever.
        let landmarker: FaceLandmarker;
        try {
          landmarker = await Promise.race([
            create(fileset, "GPU"),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("GPU delegate timed out")), GPU_INIT_TIMEOUT_MS),
            ),
          ]);
          delegateRef.current = "GPU";
        } catch (gpuErr) {
          console.warn("GPU delegate unavailable, falling back to CPU:", gpuErr);
          landmarker = await create(fileset, "CPU");
          delegateRef.current = "CPU";
        }

        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setDelegate(delegateRef.current);
        setModelState("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("FaceLandmarker failed to load:", err);
        setErrorMessage(
          err instanceof Error ? err.message : "Could not load the face tracking model.",
        );
        setModelState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || modelState !== "ready") return;

    const drawOverlay = (
      ctx: CanvasRenderingContext2D,
      left: Point[],
      right: Point[],
      isOpen: boolean,
    ) => {
      const colour = isOpen ? "#00f0ff" : "#ff0055";
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = 2;
      ctx.shadowColor = colour;
      ctx.shadowBlur = 8;

      for (const eye of [left, right]) {
        if (eye.length < 6) continue;
        // Draw in P1, P2, P3, P4, P5, P6 order so the outline traces the lid.
        ctx.beginPath();
        ctx.moveTo(eye[0].x, eye[0].y);
        for (let i = 1; i < eye.length; i++) ctx.lineTo(eye[i].x, eye[i].y);
        ctx.closePath();
        ctx.stroke();

        for (const p of eye) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    };

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      // Match the canvas to the source so landmark pixels line up exactly.
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // MediaPipe rejects a repeated timestamp, so only detect on new frames.
      let result = null;
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          result = landmarker.detectForVideo(video, performance.now());
        } catch (err) {
          console.warn("detectForVideo failed for this frame:", err);
          return;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!result) return;

      const now = performance.now();
      frameTimesRef.current.push(now);
      while (frameTimesRef.current.length > 0 && now - frameTimesRef.current[0] > 1000) {
        frameTimesRef.current.shift();
      }

      const faces = result.faceLandmarks;
      if (!faces || faces.length === 0) {
        faceDetectedRef.current = false;
        closedFramesRef.current = 0;
        return;
      }
      faceDetectedRef.current = true;

      // Landmarks are normalised 0..1. Scale to pixels before measuring, or a
      // non-square frame would distort the vertical/horizontal ratio.
      const lm = faces[0];
      const toPixels = (indices: readonly number[]): Point[] =>
        indices.map((i) => ({
          x: lm[i].x * canvas.width,
          y: lm[i].y * canvas.height,
        }));

      const leftEye = toPixels(LEFT_EYE_INDICES);
      const rightEye = toPixels(RIGHT_EYE_INDICES);

      const ear = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;
      earRef.current = ear;

      // ── Calibration: average the open-eye EAR over a few seconds ──────────
      if (calibratingRef.current) {
        calibrationSamplesRef.current.push(ear);
        const elapsed = now - calibrationStartRef.current;
        setCalibrationProgress(Math.min(1, elapsed / (CALIBRATION_SECONDS * 1000)));

        if (elapsed >= CALIBRATION_SECONDS * 1000) {
          const samples = calibrationSamplesRef.current.filter((v) => v > 0).sort((a, b) => a - b);
          // Median is robust to the odd blink during calibration.
          const median = samples.length
            ? samples[Math.floor(samples.length / 2)]
            : DEFAULT_EAR_THRESHOLD / 0.78;
          const threshold = thresholdFromBaseline(median);
          thresholdRef.current = threshold;
          calibratingRef.current = false;
          setBaselineEar(Number(median.toFixed(3)));
          setEarThreshold(Number(threshold.toFixed(3)));
          setIsCalibrating(false);
          setCalibrationProgress(1);
        }
      }

      // ── Blink detection: count on the rising edge after N closed frames ───
      const threshold = thresholdRef.current;
      if (ear < threshold) {
        closedFramesRef.current += 1;
        statusRef.current = "Closed";
      } else {
        if (closedFramesRef.current >= BLINK_CONSEC_FRAMES) {
          blinkCountRef.current += 1;
          blinkTimestampsRef.current.push(now);
        }
        closedFramesRef.current = 0;

        // Eyes open but lids not fully parting is the incomplete-blink pattern
        // associated with tear film breakup.
        statusRef.current = ear < threshold * 1.12 ? "Dry Eye Risk" : "Open";
        if (statusRef.current === "Dry Eye Risk") onDryEyePatternRef.current?.();
      }

      while (
        blinkTimestampsRef.current.length > 0 &&
        now - blinkTimestampsRef.current[0] > BLINK_WINDOW_MS
      ) {
        blinkTimestampsRef.current.shift();
      }

      drawOverlay(ctx, leftEye, rightEye, statusRef.current !== "Closed");
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastVideoTimeRef.current = -1;
    };
  }, [enabled, modelState, videoRef, canvasRef]);

  // ── Publish to React state at a sane rate ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const now = performance.now();
      const recent = blinkTimestampsRef.current;
      // Extrapolate from the window we have so the figure is usable before a
      // full minute has elapsed.
      const windowMs = Math.min(BLINK_WINDOW_MS, Math.max(10_000, now));
      const rate = recent.length * (60_000 / windowMs);

      setPublished({
        faceDetected: faceDetectedRef.current,
        ear: Number(earRef.current.toFixed(3)),
        eyeStatus: statusRef.current,
        blinkCount: blinkCountRef.current,
        blinkRate: Math.round(rate),
        fps: frameTimesRef.current.length,
      });
    }, PUBLISH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);

  // ── Release the model when monitoring stops ───────────────────────────────
  useEffect(() => {
    if (enabled) return;
    return () => {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      delegateRef.current = null;
      setDelegate(null);
      setModelState("idle");
    };
  }, [enabled]);

  const startCalibration = useCallback(() => {
    calibrationSamplesRef.current = [];
    calibrationStartRef.current = performance.now();
    calibratingRef.current = true;
    setIsCalibrating(true);
    setCalibrationProgress(0);
  }, []);

  const resetSession = useCallback(() => {
    blinkCountRef.current = 0;
    blinkTimestampsRef.current = [];
    closedFramesRef.current = 0;
    setPublished((p) => ({ ...p, blinkCount: 0, blinkRate: 0 }));
  }, []);

  return {
    modelState,
    errorMessage,
    delegate,
    ...published,
    isCalibrating,
    calibrationProgress,
    baselineEar,
    earThreshold,
    startCalibration,
    resetSession,
  };
}
