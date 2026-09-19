import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { assessDryEyeRisk, calculateEAR, calculateHealthScore } from "./ear";

/**
 * The scoring logic exists twice: here in TypeScript for in-browser detection,
 * and in backend/models/ear_calc.py for the Flask path. A user switching
 * between the two must not see different numbers for the same session, so this
 * runs both over the same grid and compares.
 *
 * Skips when no Python interpreter is on PATH, so `npm test` still works on a
 * machine set up only for the frontend.
 */

const findPython = (): string | null => {
  for (const candidate of ["python", "python3", "py"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try the next one
    }
  }
  return null;
};

const python = findPython();

const EYES: number[][][] = [
  [[0, 0], [3, -2], [7, -2], [10, 0], [7, 2], [3, 2]],
  [[0, 0], [30, -20], [70, -20], [100, 0], [70, 20], [30, 20]],
  [[5, 5], [8, 4], [12, 4], [15, 5], [12, 6], [8, 6]],
  [[0, 0], [3, -0.1], [7, -0.1], [10, 0], [7, 0.1], [3, 0.1]],
];

const EARS = [0, 0.1, 0.15, 0.18, 0.21, 0.25, 0.3, 0.35];
const RATES = [0, 7, 8, 11, 12, 14, 15, 18, 22, 30];
const TIMES = [0, 15, 30, 31, 60, 61, 90, 120, 121, 200];

describe.skipIf(!python)("Python and TypeScript produce identical scores", () => {
  const runPython = (script: string): unknown =>
    JSON.parse(
      execFileSync(python as string, ["-c", script], {
        cwd: "backend",
        encoding: "utf-8",
      }),
    );

  it("computes the same Eye Aspect Ratio from the same landmarks", () => {
    const expected = runPython(`
import json
from models.ear_calc import calculate_ear
eyes = json.loads(${JSON.stringify(JSON.stringify(EYES))})
print(json.dumps([calculate_ear(e) for e in eyes]))
`) as number[];

    const actual = EYES.map((e) => calculateEAR(e.map(([x, y]) => ({ x, y }))));

    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 9));
  });

  it("assigns the same risk level and score across the input grid", () => {
    const expected = runPython(`
import json
from models.ear_calc import assess_dry_eye_risk
ears, rates, times = ${JSON.stringify(EARS)}, ${JSON.stringify(RATES)}, ${JSON.stringify(TIMES)}
out = []
for e in ears:
    for r in rates:
        for t in times:
            level, score = assess_dry_eye_risk(e, r, t)
            out.append([level, score])
print(json.dumps(out))
`) as [string, number][];

    const actual: [string, number][] = [];
    for (const ear of EARS)
      for (const rate of RATES)
        for (const time of TIMES) {
          const { level, score } = assessDryEyeRisk(ear, rate, time);
          actual.push([level, score]);
        }

    expect(actual).toEqual(expected);
  });

  it("computes the same health score across the input grid", () => {
    const expected = runPython(`
import json
from models.ear_calc import calculate_health_score
ears, rates, times = ${JSON.stringify(EARS)}, ${JSON.stringify(RATES)}, ${JSON.stringify(TIMES)}
print(json.dumps([
    calculate_health_score(e, r, t)
    for e in ears for r in rates for t in times
]))
`) as number[];

    const actual: number[] = [];
    for (const ear of EARS)
      for (const rate of RATES)
        for (const time of TIMES) actual.push(calculateHealthScore(ear, rate, time));

    expect(actual).toEqual(expected);
  });
});
