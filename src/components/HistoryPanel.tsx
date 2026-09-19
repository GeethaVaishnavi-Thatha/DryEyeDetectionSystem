import { useMemo, useState } from 'react';
import { CalendarDays, Database, RefreshCw, Trash2, Table2, BarChart3 } from 'lucide-react';
import type { DailyStat, HistorySummary, StoredSession } from '../lib/sessionApi';

/**
 * Long-term history, served by the Flask backend.
 *
 * The browser detects blinks but cannot remember them between visits, so
 * everything here comes from stored sessions. When the backend is not running
 * the panel explains that rather than showing an empty chart.
 */

// Single series, so no categorical palette is needed. This step passes the
// dark-mode lightness band (L 0.48–0.67) and 3:1 contrast on the slate surface.
const BAR = '#0891b2';
const BAR_HOVER = '#0ea5b7';

// A healthy blink rate is 15–20 per minute; the band makes "was this a good
// day" readable without comparing every bar to the axis.
const HEALTHY_LOW = 15;
const HEALTHY_HIGH = 20;

const RANGES = [7, 14, 30] as const;

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const shortDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
};

interface Props {
  available: boolean | null;
  loading: boolean;
  daily: DailyStat[];
  summary: HistorySummary | null;
  sessions: StoredSession[];
  rangeDays: number;
  setRangeDays: (days: number) => void;
  refresh: () => void;
  clear: () => void;
}

export default function HistoryPanel({
  available, loading, daily, summary, sessions, rangeDays, setRangeDays, refresh, clear,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  // Scale to the healthy band even on quiet days, so a low bar reads as low
  // rather than filling the plot.
  const maxRate = useMemo(
    () => Math.max(HEALTHY_HIGH + 4, ...daily.map(d => d.avg_blink_rate)),
    [daily],
  );

  const hasData = daily.some(d => d.sessions > 0);

  // ── Backend not running ───────────────────────────────────────────────────
  if (available === false) {
    return (
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-500" />
          <span>Session history</span>
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed max-w-prose">
          History is stored by the Flask backend, which isn't running. Detection and
          everything else on this page works without it — you just won't see trends
          across days.
        </p>
        <pre className="mt-4 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-300 overflow-x-auto">
          cd backend{'\n'}python app.py
        </pre>
        <button
          onClick={refresh}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Check again
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
      {/* Filters sit in one row above the chart */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-cyan-400" />
          <span>Session history</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
        </h3>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-1 flex items-center gap-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  rangeDays === r ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>

          <button
            onClick={() => setAsTable(v => !v)}
            title={asTable ? 'Show chart' : 'Show as table'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            {asTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
          </button>

          <button
            onClick={refresh}
            title="Refresh"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Window totals */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Sessions', value: summary.sessions },
            { label: 'Total blinks', value: summary.total_blinks.toLocaleString() },
            { label: 'Time tracked', value: fmtDuration(summary.total_seconds) },
            { label: 'Avg blinks/min', value: summary.avg_blink_rate || '—' },
          ].map(tile => (
            <div key={tile.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{tile.label}</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">{tile.value}</div>
            </div>
          ))}
        </div>
      )}

      {!hasData ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No sessions recorded in the last {rangeDays} days. Run the scanner for at least
          five seconds and the session will be saved here when you stop.
        </p>
      ) : asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Average blinks per minute by day</caption>
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th scope="col" className="text-left p-2">Day</th>
                <th scope="col" className="text-right p-2">Sessions</th>
                <th scope="col" className="text-right p-2">Blinks</th>
                <th scope="col" className="text-right p-2">Blinks/min</th>
                <th scope="col" className="text-right p-2">Tracked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 tabular-nums">
              {daily.map(d => (
                <tr key={d.day}>
                  <th scope="row" className="text-left p-2 font-medium text-white">{d.day}</th>
                  <td className="text-right p-2">{d.sessions}</td>
                  <td className="text-right p-2">{d.blinks}</td>
                  <td className="text-right p-2">{d.avg_blink_rate || '—'}</td>
                  <td className="text-right p-2">{d.seconds ? fmtDuration(d.seconds) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <figure className="m-0">
          <figcaption className="text-xs text-slate-400 mb-3">
            Average blinks per minute, by day.{' '}
            <span className="text-slate-500">Shaded band is the healthy 15–20 range.</span>
          </figcaption>

          <div className="relative">
            <svg viewBox="0 0 640 220" className="w-full h-auto" role="img"
                 aria-label={`Average blinks per minute for the last ${rangeDays} days`}>
              {(() => {
                const padL = 34, padR = 8, padT = 10, padB = 28;
                const w = 640 - padL - padR;
                const h = 220 - padT - padB;
                const y = (v: number) => padT + h - (v / maxRate) * h;
                const slot = w / daily.length;
                const barW = Math.max(6, Math.min(44, slot - 8)); // 2px+ gap between fills

                return (
                  <>
                    {/* Recessive grid */}
                    {[0, 5, 10, 15, 20, 25].filter(v => v <= maxRate).map(v => (
                      <g key={v}>
                        <line x1={padL} x2={640 - padR} y1={y(v)} y2={y(v)}
                              stroke="#1e293b" strokeWidth="1" />
                        <text x={padL - 6} y={y(v) + 3.5} textAnchor="end"
                              fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">{v}</text>
                      </g>
                    ))}

                    {/* Healthy band — neutral, not a competing series colour */}
                    <rect x={padL} y={y(HEALTHY_HIGH)} width={w}
                          height={Math.max(0, y(HEALTHY_LOW) - y(HEALTHY_HIGH))}
                          fill="#94a3b8" opacity="0.10" />

                    {daily.map((d, i) => {
                      const cx = padL + slot * i + slot / 2;
                      const top = d.avg_blink_rate > 0 ? y(d.avg_blink_rate) : y(0);
                      const barH = Math.max(0, y(0) - top);
                      const on = hovered === i;
                      return (
                        <g key={d.day}
                           onMouseEnter={() => setHovered(i)}
                           onMouseLeave={() => setHovered(null)}>
                          {/* Hit target wider than the mark */}
                          <rect x={cx - slot / 2} y={padT} width={slot} height={h} fill="transparent" />
                          {barH > 0 && (
                            <rect x={cx - barW / 2} y={top} width={barW} height={barH}
                                  rx="4" fill={on ? BAR_HOVER : BAR} />
                          )}
                          {d.avg_blink_rate > 0 && (
                            <text x={cx} y={top - 5} textAnchor="middle" fill="#cbd5e1"
                                  fontSize="9.5" fontFamily="ui-monospace, monospace">
                              {d.avg_blink_rate}
                            </text>
                          )}
                          <text x={cx} y={220 - 9} textAnchor="middle"
                                fill={on ? '#e2e8f0' : '#64748b'} fontSize="9.5">
                            {daily.length <= 14 ? shortDay(d.day) : d.day.slice(8)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            {hovered !== null && daily[hovered] && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-slate-950/95 border border-slate-700 shadow-xl text-xs pointer-events-none">
                <div className="font-semibold text-white mb-0.5">{daily[hovered].day}</div>
                <div className="text-slate-300 tabular-nums">
                  {daily[hovered].sessions} session{daily[hovered].sessions === 1 ? '' : 's'} ·{' '}
                  {daily[hovered].blinks} blinks ·{' '}
                  {daily[hovered].avg_blink_rate || 0}/min
                </div>
                {daily[hovered].seconds > 0 && (
                  <div className="text-slate-500">{fmtDuration(daily[hovered].seconds)} tracked</div>
                )}
              </div>
            )}
          </div>
        </figure>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Recent sessions
            </h4>
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>

          <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {sessions.slice(0, 12).map(s => (
              <li key={s.id}
                  className="flex items-center justify-between gap-3 text-xs bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2">
                <span className="text-slate-300 whitespace-nowrap">
                  {new Date(s.started_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className="text-slate-400 tabular-nums whitespace-nowrap">
                  {fmtDuration(s.duration_seconds)} · {s.blink_count} blinks · {s.avg_blink_rate}/min
                </span>
                <span className={`font-semibold whitespace-nowrap ${
                  s.risk_level === 'High Risk' ? 'text-red-400'
                  : s.risk_level === 'Moderate Risk' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {s.risk_level.replace(' Risk', '')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
