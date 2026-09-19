/**
 * Client for the session history API.
 *
 * The backend is optional — detection works entirely in the browser. Every call
 * here fails soft: if the Flask server isn't running, the app carries on
 * without history rather than showing an error the user can't act on.
 */

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

/** Give up rather than hang when nothing is listening on the port. */
const TIMEOUT_MS = 4000;

export interface StoredSession {
  id: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  blink_count: number;
  avg_blink_rate: number;
  avg_ear: number;
  min_ear: number;
  fatigue_seconds: number;
  risk_level: string;
  risk_score: number;
  health_score: number;
  calibrated: boolean;
  baseline_ear: number | null;
  ear_threshold: number | null;
  source: string;
  created_at: string;
}

export interface DailyStat {
  day: string;
  sessions: number;
  blinks: number;
  seconds: number;
  avg_blink_rate: number;
  avg_health_score: number;
  avg_ear: number;
}

export interface HistorySummary {
  days: number;
  sessions: number;
  total_blinks: number;
  total_seconds: number;
  avg_blink_rate: number;
  avg_health_score: number;
  lowest_ear: number;
}

/** What the browser sends when a session ends. Snake case to match the API. */
export interface SessionDraft {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  blink_count: number;
  avg_blink_rate: number;
  avg_ear: number;
  min_ear: number;
  fatigue_seconds: number;
  risk_level: string;
  risk_score: number;
  health_score: number;
  calibrated: boolean;
  baseline_ear: number | null;
  ear_threshold: number | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });

    // 422 means the server deliberately declined (e.g. a session under five
    // seconds). That is expected, not a failure worth surfacing.
    if (res.status === 422) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.debug("Session API unavailable:", (err as Error).message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const sessionApi = {
  /** True when the Flask server is reachable. */
  async isAvailable(): Promise<boolean> {
    const res = await request<{ status?: string }>("/api/health");
    return res !== null;
  },

  async save(draft: SessionDraft): Promise<StoredSession | null> {
    const res = await request<{ success: boolean; session: StoredSession }>(
      "/api/sessions",
      { method: "POST", body: JSON.stringify(draft) },
    );
    return res?.session ?? null;
  },

  async list(days = 30, limit = 200): Promise<StoredSession[]> {
    const res = await request<{ sessions: StoredSession[] }>(
      `/api/sessions?days=${days}&limit=${limit}`,
    );
    return res?.sessions ?? [];
  },

  async stats(days = 7): Promise<{ daily: DailyStat[]; summary: HistorySummary } | null> {
    return request<{ daily: DailyStat[]; summary: HistorySummary }>(
      `/api/sessions/stats?days=${days}`,
    );
  },

  async remove(id: number): Promise<boolean> {
    return (await request<{ success: boolean }>(`/api/sessions/${id}`, { method: "DELETE" })) !== null;
  },

  async clear(): Promise<boolean> {
    return (await request<{ success: boolean }>("/api/sessions", { method: "DELETE" })) !== null;
  },
};
