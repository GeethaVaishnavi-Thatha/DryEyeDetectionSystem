import { Code, Eye, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="glass-panel border-t border-slate-800 mt-16 py-12 px-4 lg:px-8 bg-slate-950/80 shadow-2xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

        {/* About Project */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40">
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Dry Eye Detection System</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            An AI-powered healthcare application designed to combat digital eye strain through real-time Computer Vision, Eye Aspect Ratio (EAR) calculation, and proactive ergonomic alerts.
          </p>
          <div className="pt-2 flex items-center space-x-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-2 text-xs font-semibold">
              <Code className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-2 text-xs font-semibold">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>LinkedIn Connect</span>
            </a>
          </div>
        </div>

        {/* Technologies Used */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-cyan-500 pl-3">Technologies Used</h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Python 3.10+ & Flask</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> OpenCV & Mediapipe Face Mesh</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> React 19 & TypeScript</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Tailwind CSS v4</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> NumPy & Pandas</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Web Speech API</li>
          </ul>
        </div>

        {/* Contact Section */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-cyan-500 pl-3">Contact & Support</h4>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Questions about how the blink detection works, or found a bug? The
            source and issue tracker are on GitHub.
          </p>
          <a
            href="https://github.com/GeethaVaishnavi-Thatha/DryEyeDetectionSystem"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-semibold transition-all"
          >
            <Code className="w-4 h-4" />
            <span>View on GitHub</span>
          </a>
          <div className="mt-4 text-[10px] text-slate-500">
            © {new Date().getFullYear()} Smart Dry Eye Detection System. All rights reserved.
          </div>
        </div>

      </div>

      {/* Bottom Disclaimer */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 text-center text-[11px] text-slate-500 leading-relaxed">
        <strong>Medical Disclaimer:</strong> This is a personal project for monitoring screen habits, not a medical device. It measures how often you blink during a session, which is one contributing factor among many — it cannot evaluate your tear film and produces no diagnosis. "Risk level" refers to blink behaviour only. If you have persistent dry eye, pain, or changes in vision, see a qualified eye care professional.
      </div>
    </footer>
  );
}
