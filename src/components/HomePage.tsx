import { Activity, BarChart3, Bell, CheckCircle, ChevronRight, Eye, HeartPulse, Info, Play, Video } from 'lucide-react';
import type { RiskLevel } from '../lib/ear';
import type { TabId } from '../types';

interface Props {
  earValue: number;
  blinkRate: number;
  riskLevel: RiskLevel;
  setActiveTab: (tab: TabId) => void;
  setIsMonitoring: (on: boolean) => void;
}

export default function HomePage({ earValue, blinkRate, riskLevel, setActiveTab, setIsMonitoring }: Props) {
  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Attractive Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-cyan-500/30 p-8 lg:p-16 text-center shadow-2xl bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Animated Eye Graphics Placeholder */}
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <div className="absolute inset-6 rounded-full border border-blue-500 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <Eye className="w-16 h-16 text-cyan-400 animate-pulse" />
        </div>

        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-6 shadow-glow">
          AI Healthcare Premium Diagnostic Suite
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight mb-6">
          Smart Dry Eye <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Detection System</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          Tracks how often you blink while you work, and tells you when you stop. Screen use roughly halves the normal blink rate, which is what leaves eyes dry by the end of the day. Detection runs in your browser — video never leaves your device.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button 
            onClick={() => { setIsMonitoring(true); setActiveTab('monitoring'); }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Monitoring</span>
          </button>

          <button 
            onClick={() => setActiveTab('about')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 shadow-lg flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Info className="w-5 h-5" />
            <span>Learn More</span>
          </button>
        </div>

        {/* Quick Feature Badges */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-800/60 max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center">
            <Video className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <h3 className="font-semibold text-sm text-white">OpenCV & Mediapipe</h3>
            <p className="text-xs text-slate-400 mt-1">6-point eye landmark tracking</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center">
            <Activity className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-sm text-white">EAR Calculation</h3>
            <p className="text-xs text-slate-400 mt-1">Blink frequency & micro-closures</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center">
            <Bell className="w-6 h-6 text-teal-400 mx-auto mb-2" />
            <h3 className="font-semibold text-sm text-white">Smart Alerts</h3>
            <p className="text-xs text-slate-400 mt-1">20-20-20 rule & voice warnings</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center">
            <HeartPulse className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <h3 className="font-semibold text-sm text-white">Eye Ergonomics</h3>
            <p className="text-xs text-slate-400 mt-1">Built-in exercises & timers</p>
          </div>
        </div>
      </div>

      {/* Dashboard Teaser Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span>Live Diagnostic Feed Preview</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Continuous Computer Vision Analysis</p>
            </div>
            <button onClick={() => setActiveTab('monitoring')} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              <span>Open Live Scanner</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-medium text-slate-400">Eye Aspect Ratio (EAR)</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{earValue.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-1">Threshold: &lt; 0.21</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-medium text-slate-400">Blink Rate</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">{blinkRate} <span className="text-xs font-normal">BPM</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Normal: 15-20 BPM</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-medium text-slate-400">Risk Assessment</span>
              <div className={`text-xl font-bold mt-1 ${riskLevel === 'High Risk' ? 'text-red-400' : riskLevel === 'Moderate Risk' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {riskLevel}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Based on multi-factor AI</div>
            </div>
          </div>

          {/* Simulated Waveform chart */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>EAR Real-Time Waveform (Simulated)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Live</span>
            </div>
            <div className="h-28 flex items-end gap-1 pt-4 border-b border-slate-800">
              {[0.33, 0.34, 0.32, 0.18, 0.31, 0.35, 0.32, 0.30, 0.15, 0.32, 0.34, 0.31, 0.33, 0.19, 0.32, 0.34, 0.32, earValue].map((val, idx) => (
                <div key={idx} className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-400 rounded-t transition-all duration-300" style={{ height: `${(val / 0.40) * 100}%` }}>
                  <div className="opacity-0 hover:opacity-100 bg-slate-900 text-[10px] text-cyan-300 p-1 rounded absolute -mt-6 -ml-2 pointer-events-none">
                    {val}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
              <span>-30s</span>
              <span>-15s</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Quick Recommendations Card */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-pink-400" />
              <span>Instant Health Tips</span>
            </h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Prevent digital eye fatigue before symptoms worsen. Follow these daily ophthalmology guidelines:
            </p>

            <ul className="space-y-4 text-sm text-slate-200">
              <li className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">20-20-20 Rule</strong>
                  <span className="text-xs text-slate-400">Every 20 mins, look 20 feet away for 20 seconds.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Conscious Blinking</strong>
                  <span className="text-xs text-slate-400">Perform 10 full, squeezed blinks every hour.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Monitor Ergonomics</strong>
                  <span className="text-xs text-slate-400">Keep screen 20-28 inches away, slightly below eye level.</span>
                </div>
              </li>
            </ul>
          </div>

          <button 
            onClick={() => setActiveTab('exercises')}
            className="mt-6 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-semibold text-sm text-cyan-400 flex items-center justify-center gap-2 transition-all"
          >
            <span>Start Guided Exercises</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
