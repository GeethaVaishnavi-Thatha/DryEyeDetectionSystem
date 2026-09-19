import { Activity, AlertTriangle, BarChart3, Clock, Download, Eye, FileText, HeartPulse, Sun } from 'lucide-react';
import type { EyeTrackingResult } from '../hooks/useEyeTracking';
import type { RiskLevel } from '../lib/ear';
import type { SessionHistory } from '../types';

interface Props {
  tracking: EyeTrackingResult;
  screenTimeSeconds: number;
  riskLevel: RiskLevel;
  riskAssessment: { level: RiskLevel; score: number };
  aiHealthScore: number;
  hasMeasurements: boolean;
  sessionLogs: SessionHistory[];
  handleDownloadCSV: () => void;
}

export default function DashboardPage({
  tracking, screenTimeSeconds, riskLevel, riskAssessment, aiHealthScore,
  hasMeasurements, sessionLogs, handleDownloadCSV,
}: Props) {
  const { ear: earValue, blinkCount, blinkRate, fps } = tracking;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dashboard Header */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>Modern Analytics Dashboard</span>
          </h2>
          <p className="text-sm text-slate-400">Comprehensive overview of your ocular health metrics and session logs</p>
        </div>

        <button 
          onClick={handleDownloadCSV}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Blinks</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Eye className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono mb-1">{blinkCount}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>This session</span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blinks Per Minute</span>
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono mb-1">{blinkRate} <span className="text-base font-normal text-slate-400">BPM</span></div>
          <div className="text-xs text-slate-400">Optimal Range: 15-20 BPM</div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Screen Exposure</span>
            <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
              <Clock className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono mb-1">
            {Math.floor(screenTimeSeconds / 60)} <span className="text-base font-normal text-slate-400">mins</span>
          </div>
          <div className="text-xs text-yellow-400">
            {screenTimeSeconds >= 3600
              ? 'Take a break now'
              : `Take a break in ${60 - Math.floor(screenTimeSeconds / 60)} mins`}
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dry-Eye Risk</span>
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono mb-1">
            {hasMeasurements ? `${Math.round((riskAssessment.score / 7) * 100)}%` : '--'}
          </div>
          <div className="text-xs text-slate-400">
            Status: <span className="text-cyan-400 font-semibold">
              {hasMeasurements ? riskLevel : 'No data yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Charts & Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Chart: Ocular Health Indicators */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Ocular Health Indicators</span>
          </h3>

          <div className="space-y-5">
            {[
              {
                label: 'Eye Openness (EAR vs threshold)',
                value: tracking.earThreshold > 0
                  ? Math.round(Math.min(100, (earValue / (tracking.earThreshold / 0.78)) * 100))
                  : 0,
                bar: 'from-cyan-500 to-blue-500',
                text: 'text-cyan-400',
              },
              {
                label: 'Blink Rate vs optimal (15-20/min)',
                value: Math.round(Math.min(100, (blinkRate / 17) * 100)),
                bar: 'from-blue-500 to-indigo-500',
                text: 'text-blue-400',
              },
              {
                label: 'Eye Strain (inverse of health score)',
                value: hasMeasurements ? 100 - aiHealthScore : 0,
                bar: 'from-yellow-500 to-orange-500',
                text: 'text-yellow-400',
              },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-300">{item.label}</span>
                  <span className={`${item.text} font-mono`}>{item.value}%</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${item.bar} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
              Derived from the Eye Aspect Ratio and blink rate measured this session.
              Not a clinical assessment.
            </p>
          </div>

          {/* Live session figures */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-around mt-6">
            {[
              { label: 'Health Score', value: aiHealthScore, suffix: '%', colour: 'text-cyan-400' },
              { label: 'Detector FPS', value: fps, suffix: '', colour: 'text-blue-400' },
              { label: 'Blinks / min', value: blinkRate, suffix: '', colour: 'text-emerald-400' },
            ].map(g => (
              <div key={g.label} className="text-center">
                <div className="relative w-20 h-20 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path
                      className={g.colour}
                      strokeDasharray={`${Math.max(0, Math.min(100, g.suffix === '%' ? g.value : g.value * 3))}, 100`}
                      strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-sm font-bold text-white font-mono">{g.value}{g.suffix}</div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chart: Session History Log */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>User Session History</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Auto-logged every 30s</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">EAR</th>
                    <th className="p-3">Blink Rate</th>
                    <th className="p-3">Screen Time</th>
                    <th className="p-3">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {sessionLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No sessions recorded yet. Start the scanner to begin logging.
                      </td>
                    </tr>
                  )}
                  {sessionLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-white">{log.timestamp}</td>
                      <td className="p-3 text-cyan-400">{log.ear}</td>
                      <td className="p-3">{log.blinkRate} BPM</td>
                      <td className="p-3">{log.screenTime}m</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-semibold ${log.riskLevel === 'High Risk' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : log.riskLevel === 'Moderate Risk' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                          {log.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span>Showing latest {sessionLogs.length} diagnostic logs</span>
            <button 
              onClick={handleDownloadCSV} 
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>Download Full CSV</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 9. HEALTH RECOMMENDATIONS SECTION */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-pink-400" />
          <span>Ophthalmologist Health Recommendations</span>
        </h3>
        <p className="text-sm text-slate-400 mb-8 max-w-2xl">
          Implement these proven clinical practices into your daily digital routine to drastically reduce dry eye symptoms and preserve ocular comfort.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-cyan-500/40 transition-all">
            <div>
              <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 w-fit mb-4">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Blink Frequently</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Make a conscious effort to blink fully and gently. Avoid partial blinks to ensure complete lipid layer distribution.
              </p>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mt-4 block">Core Habit</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-blue-500/40 transition-all">
            <div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 w-fit mb-4">
                <Sun className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Reduce Brightness</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Match your screen brightness to your surrounding room lighting. Enable blue light filters during evening hours.
              </p>
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-4 block">Lighting Tip</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-teal-500/40 transition-all">
            <div>
              <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 w-fit mb-4">
                <Clock className="w-6 h-6 text-teal-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Take Micro-Breaks</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strictly follow the 20-20-20 rule. Stepping away from your desk every hour also reduces general muscular fatigue.
              </p>
            </div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mt-4 block">Ergonomics</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-pink-500/40 transition-all">
            <div>
              <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20 w-fit mb-4">
                <HeartPulse className="w-6 h-6 text-pink-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Perform Exercises</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Engage in palming and figure-eight ocular tracking daily to keep eye muscles flexible and relaxed.
              </p>
            </div>
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mt-4 block">Physical Therapy</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-emerald-500/40 transition-all">
            <div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 w-fit mb-4">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Stay Hydrated</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drink at least 8 glasses of water daily. Systemic hydration is directly linked to natural basal tear production.
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-4 block">Nutrition</span>
          </div>
        </div>
      </div>

    </div>
  );
}
