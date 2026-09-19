import { describe, it, expect } from "vitest";
import {
  BLINK_CONSEC_FRAMES,
  DEFAULT_EAR_THRESHOLD,
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
  assessDryEyeRisk,
  calculateEAR,
  calculateHealthScore,
  thresholdFromBaseline,
  type Point,
} from "./ear";

/**
 * Builds a symmetric eye in landmark order P1..P6.
 *
 *        P2────P3
 *   P1 ·          · P4      width = horizontal, height = 2 * halfHeight
 *        P6────P5
 */
const eye = (width: number, halfHeight: number, originX = 0, originY = 0): Point[] => [
  { x: originX, y: originY },                            // P1 outer corner
  { x: originX + width * 0.3, y: originY - halfHeight }, // P2 upper lid
  { x: originX + width * 0.7, y: originY - halfHeight }, // P3 upper lid
  { x: originX + width, y: originY },                    // P4 inner corner
  { x: originX + width * 0.7, y: originY + halfHeight }, // P5 lower lid
  { x: originX + width * 0.3, y: originY + halfHeight }, // P6 lower lid
];

describe("calculateEAR", () => {
  it("computes the ratio from the six landmark geometry", () => {
    // v1 = v2 = 4, h = 10  ->  (4 + 4) / (2 * 10) = 0.4
    expect(calculateEAR(eye(10, 2))).toBeCloseTo(0.4, 6);
  });

  it("is invariant to scale, so distance from the camera does not change it", () => {
    // This is the property that makes EAR usable at all: leaning towards the
    // screen must not register as opening your eyes wider.
    const near = calculateEAR(eye(200, 40));
    const far = calculateEAR(eye(50, 10));
    expect(near).toBeCloseTo(far, 10);
  });

  it("is invariant to translation across the frame", () => {
    expect(calculateEAR(eye(10, 2, 0, 0))).toBeCloseTo(calculateEAR(eye(10, 2, 640, 480)), 10);
  });

  it("falls towards zero as the lids close", () => {
    const open = calculateEAR(eye(10, 3));
    const half = calculateEAR(eye(10, 1.5));
    const shut = calculateEAR(eye(10, 0.05));

    expect(open).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(shut);
    expect(shut).toBeLessThan(DEFAULT_EAR_THRESHOLD);
  });

  it("returns 0 rather than dividing by zero when the corners coincide", () => {
    // Happens for a frame or two when tracking drops the face.
    const degenerate = eye(0, 2);
    expect(calculateEAR(degenerate)).toBe(0);
    expect(Number.isFinite(calculateEAR(degenerate))).toBe(true);
  });

  it("returns 0 for a short or missing landmark array", () => {
    expect(calculateEAR([])).toBe(0);
    expect(calculateEAR(eye(10, 2).slice(0, 5))).toBe(0);
    expect(calculateEAR(undefined as unknown as Point[])).toBe(0);
  });
});

describe("assessDryEyeRisk", () => {
  const healthy = { ear: 0.3, blinkRate: 18, screenTime: 10 };

  it("reports low risk for a healthy blink rate and a short session", () => {
    const { level, score } = assessDryEyeRisk(healthy.ear, healthy.blinkRate, healthy.screenTime);
    expect(level).toBe("Low Risk");
    expect(score).toBe(0);
  });

  // Boundaries matter more than midpoints: an off-by-one here silently
  // misclassifies every user sitting on the edge.
  it.each([
    [7, 3],
    [8, 2],
    [11, 2],
    [12, 1],
    [14, 1],
    [15, 0],
    [20, 0],
  ])("scores blink rate %i as %i points", (blinkRate, expected) => {
    expect(assessDryEyeRisk(0.3, blinkRate, 0).score).toBe(expected);
  });

  it.each([
    [30, 0],
    [31, 1],
    [60, 1],
    [61, 2],
    [120, 2],
    [121, 3],
  ])("scores %i minutes of screen time as %i points", (minutes, expected) => {
    expect(assessDryEyeRisk(0.3, 18, minutes).score).toBe(expected);
  });

  it("adds a point only inside the incomplete-blink band, exclusive at both ends", () => {
    expect(assessDryEyeRisk(0.15, 18, 0).score).toBe(0); // boundary, excluded
    expect(assessDryEyeRisk(0.21, 18, 0).score).toBe(0); // boundary, excluded
    expect(assessDryEyeRisk(0.18, 18, 0).score).toBe(1); // inside
    expect(assessDryEyeRisk(0.1, 18, 0).score).toBe(0); // fully closed, not incomplete
  });

  it("crosses into moderate at 3 and high at 5", () => {
    expect(assessDryEyeRisk(0.3, 12, 31).level).toBe("Low Risk"); // 1 + 1 = 2
    expect(assessDryEyeRisk(0.3, 11, 31).level).toBe("Moderate Risk"); // 2 + 1 = 3
    expect(assessDryEyeRisk(0.3, 7, 61).level).toBe("High Risk"); // 3 + 2 = 5
  });

  it("caps out at the maximum score when every factor is bad", () => {
    const { level, score } = assessDryEyeRisk(0.18, 2, 200);
    expect(score).toBe(7); // 3 blink + 1 incomplete + 3 screen time
    expect(level).toBe("High Risk");
  });
});

describe("calculateHealthScore", () => {
  it("awards a perfect score for optimal openness, blink rate and session length", () => {
    expect(calculateHealthScore(0.32, 17, 10)).toBe(100);
  });

  it("spans exactly 5 to 100 across the whole input space", () => {
    // Swept rather than spot-checked. The implementation also clamps to
    // 0..100, but that clamp is unreachable: the component maxima sum to
    // exactly 100 and the minima to exactly 5 (the blink component has a
    // floor of 5). This test pins the real achievable range, so changing any
    // component's scale without revisiting the others fails here.
    const ears = [-1, 0, 0.1, 0.15, 0.2, 0.21, 0.25, 0.3, 0.5, 99];
    const rates = [-1, 0, 7, 8, 11, 12, 14, 15, 18, 20, 25, 40, 200];
    const times = [-50, 0, 20, 21, 40, 41, 60, 61, 90, 91, 200, 100_000];

    let min = Infinity;
    let max = -Infinity;
    for (const ear of ears) {
      for (const rate of rates) {
        for (const time of times) {
          const score = calculateHealthScore(ear, rate, time);
          expect(Number.isInteger(score)).toBe(true);
          min = Math.min(min, score);
          max = Math.max(max, score);
        }
      }
    }

    expect(max).toBe(100);
    expect(min).toBe(5);
  });

  it("falls as the session lengthens with everything else held constant", () => {
    const early = calculateHealthScore(0.3, 17, 10);
    const later = calculateHealthScore(0.3, 17, 50);
    const late = calculateHealthScore(0.3, 17, 200);

    expect(early).toBeGreaterThan(later);
    expect(later).toBeGreaterThan(late);
  });

  it("treats blinking far too fast as a problem, not a bonus", () => {
    // Rapid blinking is itself an irritation symptom, so it should not score
    // the same as the optimal band.
    expect(calculateHealthScore(0.3, 40, 10)).toBeLessThan(calculateHealthScore(0.3, 17, 10));
  });

  it("bottoms out at 5 rather than 0, which the UI must not present as 'no data'", () => {
    // Documents real behaviour: the blink component has a floor of 5 points,
    // so a live session can never score 0. The dashboard uses a separate
    // hasMeasurements flag for the empty state.
    expect(calculateHealthScore(0, 0, 500)).toBe(5);
  });
});

describe("thresholdFromBaseline", () => {
  it("sets the threshold to a fraction of the measured baseline", () => {
    expect(thresholdFromBaseline(0.3)).toBeCloseTo(0.234, 6);
  });

  it("clamps so a bad calibration cannot produce an unusable threshold", () => {
    expect(thresholdFromBaseline(0.02)).toBe(0.12); // implausibly narrow eyes
    expect(thresholdFromBaseline(5)).toBe(0.3); // implausibly wide
  });

  it("falls back to the default for non-finite or non-positive input", () => {
    expect(thresholdFromBaseline(0)).toBe(DEFAULT_EAR_THRESHOLD);
    expect(thresholdFromBaseline(-1)).toBe(DEFAULT_EAR_THRESHOLD);
    expect(thresholdFromBaseline(NaN)).toBe(DEFAULT_EAR_THRESHOLD);
    expect(thresholdFromBaseline(Infinity)).toBe(DEFAULT_EAR_THRESHOLD);
  });

  it("produces a threshold an open eye clears and a closing eye crosses", () => {
    const baseline = calculateEAR(eye(10, 1.6)); // 0.32
    const threshold = thresholdFromBaseline(baseline);

    expect(calculateEAR(eye(10, 1.6))).toBeGreaterThan(threshold); // open
    expect(calculateEAR(eye(10, 0.4))).toBeLessThan(threshold); // closing
  });
});

describe("landmark index constants", () => {
  // These must stay identical to backend/utils/detector.py, or the browser and
  // the Flask server would measure different points on the same face.
  it("uses the six MediaPipe FaceMesh points the EAR formula expects", () => {
    expect(LEFT_EYE_INDICES).toEqual([362, 385, 387, 263, 373, 380]);
    expect(RIGHT_EYE_INDICES).toEqual([33, 160, 158, 133, 153, 144]);
  });

  it("requires more than one closed frame so noise is not counted as a blink", () => {
    expect(BLINK_CONSEC_FRAMES).toBeGreaterThanOrEqual(2);
  });
});
