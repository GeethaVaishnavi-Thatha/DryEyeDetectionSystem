import { BarChart3, Cpu, Eye, HeartPulse, Info, Moon, Sparkles, Sun, Video, Volume2, VolumeX } from 'lucide-react';
import type { TabId } from '../types';

interface Props {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  darkMode: boolean;
  setDarkMode: (on: boolean) => void;
  voiceAlerts: boolean;
  setVoiceAlerts: (on: boolean) => void;
  /** Drives the live dot on the Live Detection tab. */
  isMonitoring: boolean;
}

export default function Header({
  activeTab, setActiveTab, darkMode, setDarkMode, voiceAlerts, setVoiceAlerts, isMonitoring,
}: Props) {
  return (
    <>
      {/* HEADER & NAVIGATION */}
      <header className="sticky top-0 z-50 glass-panel border-b border-cyan-500/20 px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="relative p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30 flex items-center justify-center">
            <Eye className="w-7 h-7 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-300 rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Smart Dry Eye Detection
            </h1>
            <p className="text-xs text-slate-400 font-mono hidden sm:block">AI Computer Vision System v2.4</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'home' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('monitoring')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'monitoring' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <Video className="w-4 h-4" />
            <span>Live Detection</span>
            {isMonitoring && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />}
          </button>

          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('exercises')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'exercises' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Eye Exercises</span>
          </button>

          <button 
            onClick={() => setActiveTab('about')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'about' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <Info className="w-4 h-4" />
            <span>About Dry Eye</span>
          </button>

          <button 
            onClick={() => setActiveTab('future')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${activeTab === 'future' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'}`}
          >
            <Cpu className="w-4 h-4" />
            <span>Future AI</span>
          </button>
        </nav>

        {/* Quick Toggles (Voice & Theme) */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setVoiceAlerts(!voiceAlerts)} 
            title={voiceAlerts ? "Disable Voice Alerts" : "Enable Voice Alerts"}
            className={`p-2 rounded-lg border transition-all ${voiceAlerts ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
          >
            {voiceAlerts ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)} 
            title="Toggle Dark/Light Mode"
            className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAVIGATION BAR */}
      <div className="md:hidden flex items-center justify-around bg-slate-900/90 border-b border-slate-800 p-2 sticky top-[61px] z-40 backdrop-blur-md overflow-x-auto">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <Sparkles className="w-5 h-5 mb-0.5" /><span>Home</span>
        </button>
        <button onClick={() => setActiveTab('monitoring')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'monitoring' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <Video className="w-5 h-5 mb-0.5" /><span>Detect</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <BarChart3 className="w-5 h-5 mb-0.5" /><span>Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('exercises')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'exercises' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <HeartPulse className="w-5 h-5 mb-0.5" /><span>Exercises</span>
        </button>
        <button onClick={() => setActiveTab('about')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'about' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <Info className="w-5 h-5 mb-0.5" /><span>About</span>
        </button>
        <button onClick={() => setActiveTab('future')} className={`flex flex-col items-center p-1 text-xs ${activeTab === 'future' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
          <Cpu className="w-5 h-5 mb-0.5" /><span>Future</span>
        </button>
      </div>
    </>
  );
}
