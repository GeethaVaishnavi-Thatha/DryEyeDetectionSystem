import { useEffect, useState } from 'react';
import { HeartPulse, Pause, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { exercises } from '../data/exercises';

interface Props {
  speakAlert: (text: string) => void;
}

export default function ExercisesPage({ speakAlert }: Props) {
  const [selectedExercise, setSelectedExercise] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(20);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    if (exerciseTimer === 0) {
      setIsTimerRunning(false);
      speakAlert('Exercise complete. Great job resting your eyes!');
      return;
    }
    const id = setInterval(() => setExerciseTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, exerciseTimer, speakAlert]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div className="glass-panel border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <HeartPulse className="w-8 h-8 text-pink-400 animate-pulse" />
              <span>Interactive Eye Exercise Suite</span>
            </h2>
            <p className="text-slate-400 text-sm">Guided ocular relaxation routines with built-in timers and visual animations</p>
          </div>

          {/* Active Timer Display */}
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex items-center space-x-4 shadow-xl">
            <div className="text-center font-mono">
              <span className="text-xs text-slate-400 block mb-1">EXERCISE TIMER</span>
              <span className="text-3xl font-extrabold text-cyan-400">{exerciseTimer}s</span>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsTimerRunning(!isTimerRunning)} 
                className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 ${isTimerRunning ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950' : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'}`}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
              </button>
              <button 
                onClick={() => { setExerciseTimer(exercises[selectedExercise].duration); setIsTimerRunning(false); }} 
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Exercise Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {exercises.map((ex, idx) => (
            <button 
              key={idx}
              onClick={() => { setSelectedExercise(idx); setExerciseTimer(ex.duration); setIsTimerRunning(false); }}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${selectedExercise === idx ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedExercise === idx ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {ex.duration}s
                </span>
                {selectedExercise === idx && <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />}
              </div>
              <h4 className={`font-bold text-base mb-1 ${selectedExercise === idx ? 'text-white' : ''}`}>{ex.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{ex.description}</p>
            </button>
          ))}
        </div>

        {/* Active Exercise Detail Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* Left: Animation & Visual Guide */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[280px] shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

            <span className="text-xs font-mono text-cyan-400 mb-6 uppercase tracking-widest block">Interactive Visual Guide</span>

            <div className="text-5xl md:text-6xl my-6 animate-pulse select-none tracking-widest">
              {exercises[selectedExercise].animation}
            </div>

            <p className="text-xs text-slate-400 max-w-xs mt-4 leading-relaxed font-mono">
              Follow the visual rhythm above. Keep your breathing steady and deep throughout the entire duration.
            </p>
          </div>

          {/* Right: Instructions */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{exercises[selectedExercise].title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{exercises[selectedExercise].description}</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step-by-Step Instructions:</h4>
              <ol className="space-y-3">
                {exercises[selectedExercise].instructions.map((step, sIdx) => (
                  <li key={sIdx} className="flex items-start gap-3 text-sm text-slate-200">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button 
                onClick={() => { setIsTimerRunning(true); speakAlert(`Starting ${exercises[selectedExercise].title}. Follow the instructions.`); }}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Start This Routine
              </button>
              <button 
                onClick={() => speakAlert(exercises[selectedExercise].instructions.join(". "))}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Audio Guide</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
