import { Activity, Cloud, Cpu, Smartphone, Watch } from 'lucide-react';

export default function FuturePage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      <div className="glass-panel border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/40">
            <Cpu className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Future AI Enhancements</h2>
            <p className="text-slate-400 text-sm mt-1">The next generation of ophthalmic computer vision and IoT healthcare</p>
          </div>
        </div>

        <p className="text-slate-300 text-base mb-10 leading-relaxed">
          Our engineering roadmap integrates cutting-edge deep learning models, cross-platform mobile ecosystems, and advanced biometric sensors to create the ultimate preventative eye care platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Smartphone className="w-24 h-24 text-cyan-400" />
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 w-fit mb-6">
              <Smartphone className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Mobile App Integration</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Seamless iOS & Android companion applications utilizing TrueDepth camera sensors for continuous mobile blink tracking and automated background screen time monitoring.
            </p>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Q3 Roadmap</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cloud className="w-24 h-24 text-blue-400" />
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/30 w-fit mb-6">
              <Cloud className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Cloud Storage & Telehealth</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Secure HIPAA-compliant cloud synchronization allowing instant sharing of longitudinal blink frequency reports directly with your optometrist or ophthalmologist.
            </p>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Q4 Roadmap</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-teal-500/40 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 text-teal-400" />
            </div>
            <div className="p-3 bg-teal-500/10 rounded-2xl border border-teal-500/30 w-fit mb-6">
              <Activity className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">AI Fatigue Prediction</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Advanced LSTM neural networks analyzing micro-fluctuations in blink velocity and saccadic eye movements to predict digital eye fatigue 30 minutes before symptoms manifest.
            </p>
            <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">Active Research</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:border-pink-500/40 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Watch className="w-24 h-24 text-pink-400" />
            </div>
            <div className="p-3 bg-pink-500/10 rounded-2xl border border-pink-500/30 w-fit mb-6">
              <Watch className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Wearable Integration</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Haptic synchronization with Apple Watch, WearOS, and smart glasses (e.g., Meta Ray-Bans) to provide subtle vibrational cues reminding users to blink and hydrate.
            </p>
            <span className="text-xs font-mono font-bold text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">Concept Phase</span>
          </div>

        </div>

        {/* Architecture Diagram Placeholder */}
        <div className="mt-12 bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center shadow-inner">
          <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Full-Stack AI Architecture Overview</span>
          </h4>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto mb-8">
            Our hybrid system leverages local browser-based WebAssembly acceleration for instant mesh tracking alongside Python Flask microservices for heavy OpenCV processing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-cyan-400 font-bold mb-2">Frontend Client</div>
              <div className="text-xs text-slate-400">React 19 + Vite + Tailwind CSS. Real-time canvas overlay & speech synthesis alerts.</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-blue-400 font-bold mb-2">AI Vision Bridge</div>
              <div className="text-xs text-slate-400">Mediapipe Face Mesh & OpenCV landmark extraction calculating Eye Aspect Ratio (EAR).</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-teal-400 font-bold mb-2">Python Backend</div>
              <div className="text-xs text-slate-400">Flask REST API, Pandas CSV report generation, and continuous session history tracking.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
