import { AlertTriangle, Eye, Info, Laptop, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      <div className="glass-panel border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/40">
            <Info className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">About Dry Eye Syndrome</h2>
            <p className="text-slate-400 text-sm mt-1">Understanding the medical science behind digital eye strain</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-slate-300 leading-relaxed">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-cyan-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span>What is Dry Eye Syndrome (DES)?</span>
            </h3>
            <p>
              Dry eye syndrome is a common condition that occurs when your tears aren't able to provide adequate lubrication for your eyes. Tears can be inadequate for many reasons. For example, dry eyes may occur if you don't produce enough tears or if you produce poor-quality tears. This instability leads to inflammation and damage of the eye's surface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-400" />
                <span>Problems Caused by Excessive Screen Usage</span>
              </h4>
              <p className="text-sm text-slate-400 mb-4">
                When viewing digital screens, our natural blink rate drops from 15-20 blinks per minute down to 5-7 blinks per minute. This causes:
              </p>
              <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
                <li>Rapid tear film evaporation</li>
                <li>Meibomian gland dysfunction (MGD)</li>
                <li>Blurry vision & ocular burning</li>
                <li>Chronic headaches & neck fatigue</li>
                <li>Photophobia (light sensitivity)</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Eye className="w-5 h-5 text-teal-400" />
                <span>The Importance of Blinking</span>
              </h4>
              <p className="text-sm text-slate-400 mb-4">
                Blinking is essential for ocular health. Every complete blink performs three critical functions:
              </p>
              <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
                <li>Spreads the tear film evenly across the cornea</li>
                <li>Flushes out environmental debris & irritants</li>
                <li>Expresses vital lipid oils from eyelid glands to prevent tear evaporation</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 p-8 rounded-2xl mt-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span>Benefits of Our AI Detection System</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h5 className="font-bold text-cyan-300 mb-1">Real-Time Precision</h5>
                <p className="text-xs text-slate-400">Tracks micro-blinks and partial closures using 6-point eye mesh geometry.</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h5 className="font-bold text-cyan-300 mb-1">Proactive Interventions</h5>
                <p className="text-xs text-slate-400">Alerts you before severe eye strain sets in, ensuring long-term vision protection.</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h5 className="font-bold text-cyan-300 mb-1">Medical Export</h5>
                <p className="text-xs text-slate-400">Generates comprehensive CSV session reports suitable for ophthalmologist review.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
