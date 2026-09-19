import { useCallback, useEffect, useRef, useState } from "react";
import {
  sessionApi,
  type DailyStat,
  type HistorySummary,
  type SessionDraft,
  type StoredSession,
} from "../lib/sessionApi";

/**
 * Records finished sessions and reads history back.
 *
 * The browser does the detecting but cannot remember anything across visits;
 * this is the half the Flask backend is responsible for. When the backend is
 * not running everything here degrades to empty, and the rest of the app is
 * unaffected.
 */
export function useSessionHistory() {
  const [available, setAvailable] = useState<boolean | null>(null); // null = not yet checked
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<StoredSession | null>(null);
  const [rangeDays, setRangeDays] = useState(7);

  const refresh = useCallback(async (days = rangeDays) => {
    setLoading(true);
    try {
      const reachable = await sessionApi.isAvailable();
      setAvailable(reachable);
      if (!reachable) {
        setSessions([]);
        setDaily([]);
        setSummary(null);
        return;
      }

      const [list, stats] = await Promise.all([
        sessionApi.list(Math.max(days, 30)),
        sessionApi.stats(days),
      ]);
      setSessions(list);
      setDaily(stats?.daily ?? []);
      setSummary(stats?.summary ?? null);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void refresh(rangeDays);
  }, [refresh, rangeDays]);

  const save = useCallback(async (draft: SessionDraft) => {
    const stored = await sessionApi.save(draft);
    if (stored) {
      setLastSaved(stored);
      void refresh();
    }
    return stored;
  }, [refresh]);

  const remove = useCallback(async (id: number) => {
    if (await sessionApi.remove(id)) void refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    if (await sessionApi.clear()) void refresh();
  }, [refresh]);

  return {
    available,
    sessions,
    daily,
    summary,
    loading,
    lastSaved,
    rangeDays,
    setRangeDays,
    refresh,
    save,
    remove,
    clear,
  };
}

/**
 * Accumulates the running totals a session needs, so the figures posted at the
 * end describe the whole session rather than whatever the last frame happened
 * to read.
 */
export function useSessionRecorder(isMonitoring: boolean) {
  const startedAtRef = useRef<string | null>(null);
  const earSumRef = useRef(0);
  const earSamplesRef = useRef(0);
  const minEarRef = useRef(Number.POSITIVE_INFINITY);
  const rateSumRef = useRef(0);
  const rateSamplesRef = useRef(0);

  const reset = useCallback(() => {
    startedAtRef.current = null;
    earSumRef.current = 0;
    earSamplesRef.current = 0;
    minEarRef.current = Number.POSITIVE_INFINITY;
    rateSumRef.current = 0;
    rateSamplesRef.current = 0;
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      reset();
      startedAtRef.current = new Date().toISOString();
    }
  }, [isMonitoring, reset]);

  /** Called once a second while a face is visible. */
  const sample = useCallback((ear: number, blinkRate: number) => {
    if (ear > 0) {
      earSumRef.current += ear;
      earSamplesRef.current += 1;
      minEarRef.current = Math.min(minEarRef.current, ear);
    }
    rateSumRef.current += blinkRate;
    rateSamplesRef.current += 1;
  }, []);

  const build = useCallback((fields: {
    durationSeconds: number;
    blinkCount: number;
    fatigueSeconds: number;
    riskLevel: string;
    riskScore: number;
    healthScore: number;
    calibrated: boolean;
    baselineEar: number | null;
    earThreshold: number | null;
  }): SessionDraft | null => {
    if (!startedAtRef.current) return null;

    const avgEar = earSamplesRef.current ? earSumRef.current / earSamplesRef.current : 0;
    const avgRate = rateSamplesRef.current ? rateSumRef.current / rateSamplesRef.current : 0;

    return {
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      duration_seconds: fields.durationSeconds,
      blink_count: fields.blinkCount,
      avg_blink_rate: Number(avgRate.toFixed(1)),
      avg_ear: Number(avgEar.toFixed(3)),
      min_ear: Number.isFinite(minEarRef.current) ? Number(minEarRef.current.toFixed(3)) : 0,
      fatigue_seconds: fields.fatigueSeconds,
      risk_level: fields.riskLevel,
      risk_score: fields.riskScore,
      health_score: fields.healthScore,
      calibrated: fields.calibrated,
      baseline_ear: fields.baselineEar,
      ear_threshold: fields.earThreshold,
    };
  }, []);

  return { sample, build, reset };
}
