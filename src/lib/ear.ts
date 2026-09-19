/**
 * Eye Aspect Ratio and dry eye risk scoring.
 *
 * Ported from backend/models/ear_calc.py so the browser and the Flask server
 * produce identical numbers for the same input. Keep the two in sync.
 *
 * Every function here is pure — no DOM, no camera, no React — which is what
 * makes them straightforward to unit test.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * MediaPipe FaceMesh landmark indices for the six points the EAR formula needs,
 * ordered P1..P6:
 *   P1, P4 — outer and inner eye corners (horizontal)
 *   P2, P6 — upper lid
 *   P3, P5 — lower lid
 */
export const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const;
export const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const;

/** Below this EAR the eye counts as closed. See calibrate() for why it's a default, not a law. */
export const DEFAULT_EAR_THRESHOLD = 0.21;

/** A blink must persist this many frames to count, which rejects single-frame noise. */
export const BLINK_CONSEC_FRAMES = 2;

const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Eye Aspect Ratio:  (||P2-P6|| + ||P3-P5||) / (2 * ||P1-P4||)
 *
 * Returns 0 for degenerate geometry (eye corners coincident), which happens
 * when tracking briefly loses the face, rather than dividing by zero.
 */
export function calculateEAR(eye: Point[]): number {
  if (!eye || eye.length < 6) return 0;

  const v1 = distance(eye[1], eye[5]);
  const v2 = distance(eye[2], eye[4]);
  const h = distance(eye[0], eye[3]);

  if (h < 1e-6) return 0;

  return (v1 + v2) / (2 * h);
}

export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";

/**
 * Composite dry eye risk from blink rate, eye openness and session length.
 * A healthy blink rate is roughly 15–20 per minute; screen use typically
 * suppresses it well below that.
 */
export function assessDryEyeRisk(
  ear: number,
  blinkRate: number,
  screenTimeMinutes: number,
): { level: RiskLevel; score: number } {
  let score = 0;

  if (blinkRate < 8) score += 3;
  else if (blinkRate < 12) score += 2;
  else if (blinkRate < 15) score += 1;

  // Incomplete blinks: lids not fully closing leaves the tear film uneven.
  if (ear < 0.21 && ear > 0.15) score += 1;

  if (screenTimeMinutes > 120) score += 3;
  else if (screenTimeMinutes > 60) score += 2;
  else if (screenTimeMinutes > 30) score += 1;

  const level: RiskLevel =
    score >= 5 ? "High Risk" : score >= 3 ? "Moderate Risk" : "Low Risk";

  return { level, score };
}

/**
 * Single 0–100 indicator combining openness (0–35), blink rate (0–40) and
 * time at the screen (0–25).
 */
export function calculateHealthScore(
  ear: number,
  blinkRate: number,
  screenTimeMinutes: number,
): number {
  let earScore: number;
  if (ear >= 0.3) earScore = 35;
  else if (ear >= 0.25) earScore = 30;
  else if (ear >= 0.21) earScore = 20;
  else if (ear >= 0.15) earScore = 10;
  else earScore = 0;

  let blinkScore: number;
  if (blinkRate >= 15 && blinkRate <= 20) blinkScore = 40;
  else if ((blinkRate >= 12 && blinkRate < 15) || (blinkRate > 20 && blinkRate <= 25)) blinkScore = 30;
  else if (blinkRate >= 8 && blinkRate < 12) blinkScore = 15;
  else blinkScore = 5;

  let timeScore: number;
  if (screenTimeMinutes <= 20) timeScore = 25;
  else if (screenTimeMinutes <= 40) timeScore = 20;
  else if (screenTimeMinutes <= 60) timeScore = 15;
  else if (screenTimeMinutes <= 90) timeScore = 8;
  else timeScore = 0;

  return Math.max(0, Math.min(100, earScore + blinkScore + timeScore));
}

/**
 * Derive a per-user blink threshold from their own resting EAR.
 *
 * 0.21 is a population average; actual open-eye EAR varies enough between
 * people that a fixed threshold misses blinks for some and double-counts for
 * others. Taking a fraction of the individual's measured baseline is more
 * reliable. Clamped so a bad calibration cannot produce a useless threshold.
 */
export function thresholdFromBaseline(baselineEar: number, fraction = 0.78): number {
  if (!Number.isFinite(baselineEar) || baselineEar <= 0) {
    return DEFAULT_EAR_THRESHOLD;
  }
  return Math.min(0.30, Math.max(0.12, baselineEar * fraction));
}
