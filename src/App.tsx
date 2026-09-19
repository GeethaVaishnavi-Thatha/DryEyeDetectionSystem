import { useState, useEffect, useRef } from 'react';
import { useEyeTracking, CALIBRATION_SECONDS } from './hooks/useEyeTracking';
import { assessDryEyeRisk, calculateHealthScore } from './lib/ear';
import { 
  Eye, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Info, 
  FileText, 
  BarChart3, 
  ShieldAlert, 
  Sparkles, 
  Smartphone, 
  Cloud, 
  Cpu, 
  Watch, 
  Code, 
  Globe, 
  Mail, 
  ChevronRight, 
  HeartPulse, 
  Video, 
  Bell,
  Laptop
} from 'lucide-react';

// Types
interface SessionHistory {
  timestamp: string;
  ear: number;
  blinkRate: number;
  screenTime: number;
  status: string;
  riskLevel: string;
}

export default function App() {
  // Navigation & Theme State
  const [activeTab, setActiveTab] = useState<'home' | 'monitoring' | 'dashboard' | 'exercises' | 'about' | 'future'>('home');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // AI & Monitoring State
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [backendMode, setBackendMode] = useState<'browser' | 'python'>('browser');
  const [screenTimeSeconds, setScreenTimeSeconds] = useState<number>(0);
  const [fatigueSeconds, setFatigueSeconds] = useState<number>(0);

  // Alerts & Voice State
  const [voiceAlerts, setVoiceAlerts] = useState<boolean>(true);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<string[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionHistory[]>([]);

  // Exercise State
  const [selectedExercise, setSelectedExercise] = useState<number>(0);
  const [exerciseTimer, setExerciseTimer] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Video/Webcam refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Real detection ────────────────────────────────────────────────────────
  // Every metric below is computed from the webcam by MediaPipe FaceLandmarker.
  // There is no simulated data path.
  const tracking = useEyeTracking({
    videoRef,
    canvasRef,
    enabled: isMonitoring && backendMode === 'browser',
  });

  const { ear: earValue, eyeStatus, blinkCount, blinkRate, faceDetected, modelState, fps } = tracking;

  const screenTimeMinutes = screenTimeSeconds / 60;
  // Only score once the detector has actually seen a face this session.
  const hasMeasurements = faceDetected || screenTimeSeconds > 0;
  const riskAssessment = assessDryEyeRisk(earValue, blinkRate, screenTimeMinutes);
  const riskLevel = hasMeasurements ? riskAssessment.level : 'Low Risk';
  const aiHealthScore = hasMeasurements
    ? calculateHealthScore(earValue, blinkRate, screenTimeMinutes)
    : 0;

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Speech Synthesis Helper
  const speakAlert = (text: string) => {
    if (voiceAlerts && 'speechSynthesis' in window) {
      // Cancel pending speech to avoid backlog
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Alert helper
  const triggerAlert = (message: string) => {
    setActiveAlert(message);
    speakAlert(message);
    setAlertHistory(prev => [ `[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
    // Auto clear alert after 6 seconds
    setTimeout(() => {
      setActiveAlert(null);
    }, 6000);
  };

  // Session timer: advances screen time and periodically logs the measured
  // metrics. It reads values produced by the detector; it does not invent them.
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setScreenTimeSeconds(prev => {
        const next = prev + 1;
        const t = trackingRef.current;

        // Accumulate fatigue only while the detector can actually see the user.
        if (t.faceDetected && t.eyeStatus === 'Dry Eye Risk') {
          setFatigueSeconds(f => f + 1);
        }

        if (next % 15 === 0 && t.faceDetected) {
          const minutes = next / 60;
          const { level } = assessDryEyeRisk(t.ear, t.blinkRate, minutes);

          setSessionLogs(logs => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              ear: Number(t.ear.toFixed(2)),
              blinkRate: t.blinkRate,
              screenTime: Math.floor(minutes),
              status: t.eyeStatus,
              riskLevel: level,
            },
            ...logs.slice(0, 9),
          ]);

          if (level === 'High Risk') {
            triggerAlert("Dry eye risk detected. Please blink more frequently.");
          } else if (next % 1200 === 0) {
            triggerAlert("Screen time alert: time for the 20-20-20 rule.");
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Webcam lifecycle. The detection loop and canvas drawing live in
  // useEyeTracking, which renders the video frame and the real landmarks.
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMonitoring || backendMode !== 'browser') {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    setCameraError(null);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Webcam access failed:", err);
        setCameraError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? "Camera permission was denied. Allow camera access and start the scanner again."
            : "No camera available. Connect a webcam and start the scanner again."
        );
        setIsMonitoring(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [isMonitoring, backendMode]);

  // Exercise Timer Logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && exerciseTimer > 0) {
      interval = setInterval(() => {
        setExerciseTimer(prev => prev - 1);
      }, 1000);
    } else if (exerciseTimer === 0) {
      setIsTimerRunning(false);
      speakAlert("Exercise complete. Great job resting your eyes!");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, exerciseTimer]);

  // Handle CSV Download
  const handleDownloadCSV = () => {
    const headers = ['Timestamp', 'EAR_Value', 'Blink_Rate_BPM', 'Screen_Time_Mins', 'Eye_Status', 'Risk_Level'];
    const rows = sessionLogs.map(log => [
      log.timestamp,
      log.ear,
      log.blinkRate,
      log.screenTime,
      log.status,
      log.riskLevel
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Smart_Dry_Eye_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Eye Exercises Data
  const exercises = [
    {
      title: "The 20-20-20 Rule Focus",
      duration: 20,
      description: "Every 20 minutes, look at something 20 feet away for 20 seconds. This relieves ciliary muscle spasms.",
      animation: "👁️ ➔ ➔ ➔ 🌳 (Focus Far Away)",
      instructions: ["Find an object approximately 20 feet (6 meters) across the room or out a window.", "Focus on the object continuously.", "Blink normally while breathing deeply."]
    },
    {
      title: "Conscious Blink Training",
      duration: 30,
      description: "Digital screen users blink 66% less than normal. This exercise restores the natural lipid layer of your tear film.",
      animation: "😑 (Close) ➔ 😌 (Squeeze) ➔ 👀 (Open)",
      instructions: ["Close your eyes gently for 2 seconds.", "Squeeze the eyelids slightly for 2 seconds to express meibomian oil.", "Open your eyes wide for 2 seconds. Repeat."]
    },
    {
      title: "Palming Warmth Relaxation",
      duration: 45,
      description: "Warmth and darkness soothe the optic nerve and encourage tear production without digital strain.",
      animation: "🤲 ➔ 🙈 ➔ 😌 (Warm Darkness)",
      instructions: ["Rub your palms together rapidly until they feel warm.", "Cup your warm palms gently over your closed eyes without pressing on the eyeballs.", "Enjoy the absolute darkness and take slow, deep breaths."]
    },
    {
      title: "Figure Eight Tracking",
      duration: 40,
      description: "Enhances extraocular muscle flexibility and reduces fixed-gaze fatigue.",
      animation: "♾️ (Trace Figure 8)",
      instructions: ["Imagine a large figure eight (∞) tipped on its side about 10 feet in front of you.", "Trace the figure eight with your eyes slowly, without moving your head.", "Perform 5 circuits in one direction, then switch."]
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-[#0b0f19] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#0f172a]'}`}>
      
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

      {/* DYNAMIC ALERT POPUP BANNER */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 text-white px-4 py-3 shadow-2xl flex items-center justify-between animate-bounce sticky top-[61px] md:top-[65px] z-50 transition-all">
          <div className="flex items-center space-x-3 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-sm md:text-base">{activeAlert}</span>
          </div>
          <button onClick={() => setActiveAlert(null)} className="text-white hover:text-slate-200 font-bold text-lg px-2">×</button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-4 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* 1. HOME PAGE */}
        {activeTab === 'home' && (
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
                AI-Based Real-Time Eye Health Monitoring Using Computer Vision. Protect your vision from digital eye strain, track blink frequency, and receive real-time medical-grade ergonomic alerts.
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
        )}

        {/* 2. ABOUT SECTION */}
        {activeTab === 'about' && (
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
        )}

        {/* 3. REAL-TIME WEBCAM DETECTION & 4. BLINK DETECTION & 5. SCREEN TIME & 6. ANALYSIS */}
        {activeTab === 'monitoring' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Control Bar */}
            <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/40">
                  <Video className="w-7 h-7 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Live Computer Vision Scanner</h2>
                  <p className="text-xs text-slate-400">OpenCV & Mediapipe Face Mesh Real-Time Pipeline</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Backend Mode Selector */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-1 flex items-center space-x-1">
                  <button 
                    onClick={() => setBackendMode('browser')} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${backendMode === 'browser' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    In-Browser (MediaPipe)
                  </button>
                  <button 
                    onClick={() => {
                      setBackendMode('python');
                      triggerAlert("Attempting to connect to local Python Flask server at http://localhost:5000...");
                    }} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${backendMode === 'python' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Python Flask Feed
                  </button>
                </div>

                {/* Start/Stop Button */}
                <button 
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg transition-all ${isMonitoring ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'}`}
                >
                  {isMonitoring ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isMonitoring ? 'Stop Scanner' : 'Start Scanner'}</span>
                </button>

                {/* Reset Session */}
                <button 
                  onClick={() => {
                    tracking.resetSession();
                    setScreenTimeSeconds(0);
                    setFatigueSeconds(0);
                    setSessionLogs([]);
                    triggerAlert("Session metrics reset.");
                  }}
                  title="Reset Metrics"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Scanner Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Video Feed & Mesh Overlay */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative group bg-slate-950">
                  {/* Top Feed Bar */}
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10 relative">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-xs font-mono font-semibold text-slate-300">
                        {backendMode === 'browser' ? 'MEDIAPIPE FACELANDMARKER · IN-BROWSER (WASM)' : 'PYTHON OPENCV FLASK STREAM (localhost:5000)'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-cyan-400">
                      {isMonitoring ? (fps > 0 ? `LIVE ${fps} FPS` : 'STARTING…') : 'STANDBY'}
                    </div>
                  </div>

                  {/* Video & Canvas Container */}
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    {backendMode === 'python' ? (
                      isMonitoring ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                          {/* Fallback image representing Python video feed */}
                          <img 
                            src="http://localhost:5000/api/video_feed" 
                            alt="Python OpenCV Video Feed" 
                            onError={(e) => {
                              // Flask server is not reachable; the overlay below explains how to start it.
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-sm">
                            <AlertTriangle className="w-12 h-12 text-yellow-400 mb-3 animate-pulse" />
                            <h3 className="text-lg font-bold text-white mb-1">Python Backend Not Detected</h3>
                            <p className="text-xs text-slate-400 max-w-md mb-4">
                              Could not connect to `http://localhost:5000`. Make sure you run `python app.py` in the backend folder. Switch back to in-browser detection instead.
                            </p>
                            <button 
                              onClick={() => setBackendMode('browser')}
                              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                            >
                              Use Simulated AI Mesh Mode
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <Video className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                          <p className="text-sm text-slate-400">Click 'Start Scanner' to connect to Python backend feed</p>
                        </div>
                      )
                    ) : (
                      <>
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover hidden" playsInline muted />
                        <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

                        {/* Model download / camera failure / no-face states */}
                        {isMonitoring && modelState === 'loading' && (
                          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-sm font-semibold text-white">Loading face tracking model…</p>
                            <p className="text-xs text-slate-400 mt-1">Downloading MediaPipe FaceLandmarker (about 3.6 MB, first run only)</p>
                          </div>
                        )}

                        {isMonitoring && modelState === 'error' && (
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
                            <h3 className="text-lg font-bold text-white mb-1">Model failed to load</h3>
                            <p className="text-xs text-slate-400 max-w-md">{tracking.errorMessage}</p>
                          </div>
                        )}

                        {cameraError && (
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <AlertTriangle className="w-12 h-12 text-yellow-400 mb-3" />
                            <h3 className="text-lg font-bold text-white mb-1">Camera unavailable</h3>
                            <p className="text-xs text-slate-400 max-w-md">{cameraError}</p>
                          </div>
                        )}

                        {isMonitoring && modelState === 'ready' && !faceDetected && !cameraError && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-950/85 border border-slate-700 backdrop-blur-sm">
                            <p className="text-xs font-medium text-slate-300">No face detected — centre yourself in the frame</p>
                          </div>
                        )}

                        {isMonitoring && modelState === 'ready' && faceDetected
                          && !tracking.baselineEar && !tracking.isCalibrating && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-950/90 border border-cyan-500/40 backdrop-blur-sm">
                            <p className="text-xs text-slate-300">
                              Blink threshold is using the default 0.21
                            </p>
                            <button
                              onClick={tracking.startCalibration}
                              className="px-3 py-1 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                            >
                              Calibrate to my eyes
                            </button>
                          </div>
                        )}

                        {tracking.isCalibrating && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-sm">
                            <p className="text-xs font-semibold text-cyan-200">
                              Keep your eyes open normally… {Math.ceil(CALIBRATION_SECONDS * (1 - tracking.calibrationProgress))}s
                            </p>
                          </div>
                        )}

                        {!isMonitoring && (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 animate-bounce">
                              <Eye className="w-12 h-12 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Webcam AI Feed Standby</h3>
                            <p className="text-xs text-slate-400 max-w-sm mb-6">
                              Click Start Scanner to run MediaPipe FaceLandmarker in your browser. Video never leaves your device.
                            </p>
                            <button 
                              onClick={() => setIsMonitoring(true)} 
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20"
                            >
                              Start AI Scanner Now
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Overlay Scanning Bar Animation */}
                    {isMonitoring && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 animate-scan pointer-events-none" style={{ animationDuration: '3s' }} />
                    )}
                  </div>

                  {/* Bottom Feed HUD */}
                  <div className="bg-slate-900 p-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Blink Threshold</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {tracking.earThreshold.toFixed(3)}
                        <span className="text-[10px] text-slate-500 ml-1">
                          {tracking.baselineEar ? 'calibrated' : 'default'}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Face Tracking</span>
                      <span className={`text-sm font-mono font-bold ${faceDetected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {faceDetected ? 'LOCKED' : 'NO FACE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Eye Aspect Ratio</span>
                      <span className="text-sm font-mono font-bold text-blue-400">{earValue.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Personal Baseline</span>
                      <button 
                        onClick={tracking.startCalibration}
                        disabled={!isMonitoring || !faceDetected || tracking.isCalibrating}
                        title={
                          !isMonitoring
                            ? "Start the scanner first"
                            : !faceDetected
                              ? "Your face needs to be visible before calibrating"
                              : "Measure your own resting eye openness for a more accurate blink threshold"
                        }
                        className="mt-0.5 px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-[11px] font-semibold text-cyan-300 border border-cyan-500/40 w-full disabled:opacity-40 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500"
                      >
                        {tracking.isCalibrating
                          ? `Calibrating ${Math.round(tracking.calibrationProgress * 100)}%`
                          : tracking.baselineEar ? 'Recalibrate' : 'Calibrate'}
                      </button>
                      <span className="block text-[9px] text-slate-500 mt-1 leading-tight">
                        {!isMonitoring
                          ? 'Start the scanner first'
                          : !faceDetected
                            ? 'Waiting for your face'
                            : tracking.baselineEar
                              ? 'Tuned to your eyes'
                              : 'Tune to your eyes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Screen Time & Alert Control Center */}
                <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-400" />
                    <span>Screen Time & Fatigue Tracker</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-xs text-slate-400 mb-1">Continuous Session Time</div>
                      <div className="text-2xl font-bold text-white font-mono">
                        {Math.floor(screenTimeSeconds / 60)}m {screenTimeSeconds % 60}s
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Recommended max: 60m</div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-xs text-slate-400 mb-1">Estimated Eye Fatigue</div>
                      <div className="text-2xl font-bold text-yellow-400 font-mono">
                        {Math.floor(fatigueSeconds / 60)}m {fatigueSeconds % 60}s
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Accumulated strain duration</div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-xs text-slate-400 mb-1">AI Health Score</div>
                      <div className="text-2xl font-bold text-cyan-400 font-mono flex items-center gap-2">
                        <span>{aiHealthScore}%</span>
                        <span className="text-xs font-normal px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {aiHealthScore > 80 ? 'Optimal' : aiHealthScore > 60 ? 'Moderate' : 'Warning'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Based on blink consistency</div>
                    </div>
                  </div>

                  {/* Quick Alert Trigger Buttons for Demonstration */}
                  <div className="border-t border-slate-800 pt-6">
                    <span className="text-xs font-semibold text-slate-400 block mb-3">Simulate Medical Alert Notifications:</span>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => triggerAlert("⚠️ Dry Eye Risk Detected: Low blink frequency observed. Please blink more.")}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold transition-all"
                      >
                        Trigger "Dry Eye Risk"
                      </button>
                      <button 
                        onClick={() => triggerAlert("⏰ Take a Break: You have been staring at the screen continuously. Rest your eyes.")}
                        className="px-3 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold transition-all"
                      >
                        Trigger "Take a Break"
                      </button>
                      <button 
                        onClick={() => triggerAlert("💧 Hydrate Yourself: Drinking water supports natural tear film production.")}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all"
                      >
                        Trigger "Hydrate Yourself"
                      </button>
                      <button 
                        onClick={() => triggerAlert("🌳 20-20-20 Rule: Look at an object 20 feet away for 20 seconds.")}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all"
                      >
                        Trigger "20-20-20 Rule"
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Blink Diagnostics & Alert History */}
              <div className="space-y-6">
                
                {/* Blink Detection Panel */}
                <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <span>Blink Detection System</span>
                    </span>
                    <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-full text-cyan-300 border border-slate-700">
                      LIVE
                    </span>
                  </h3>

                  <div className="space-y-6">
                    {/* Blink Count */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Total Blinks Recorded</span>
                        <span className="text-3xl font-extrabold text-white font-mono">{blinkCount}</span>
                      </div>
                      <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                        <Eye className="w-6 h-6 text-cyan-400" />
                      </div>
                    </div>

                    {/* Blink Frequency */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Blink Frequency</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-blue-400 font-mono">{blinkRate}</span>
                          <span className="text-xs text-slate-500 font-semibold">BPM</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${blinkRate >= 15 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : blinkRate >= 10 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                          {blinkRate >= 15 ? 'Normal' : blinkRate >= 10 ? 'Low' : 'Critical'}
                        </span>
                      </div>
                    </div>

                    {/* Eye Status Indicator */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                      <span className="text-xs text-slate-400 block mb-2">Current Eye Status</span>
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full animate-pulse ${eyeStatus === 'Open' ? 'bg-emerald-500' : eyeStatus === 'Closed' ? 'bg-blue-500' : 'bg-red-500'}`} />
                        <span className="text-lg font-bold text-white tracking-wide">{eyeStatus}</span>
                      </div>
                      {eyeStatus === 'Dry Eye Risk' && (
                        <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-30 value flex items-center gap-2 animate-pulse">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>Warning: Incomplete blinks or prolonged staring detected!</span>
                        </div>
                      )}
                    </div>

                    {/* Dry Eye Analysis Risk Level */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                      <span className="text-xs text-slate-400 block mb-2">Dry Eye Risk Analysis</span>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-base font-bold ${riskLevel === 'High Risk' ? 'text-red-400' : riskLevel === 'Moderate Risk' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                          {riskLevel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Multi-Factor AI</span>
                      </div>
                      {/* Risk Progress Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${riskLevel === 'High Risk' ? 'bg-red-500' : riskLevel === 'Moderate Risk' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                          style={{ width: riskLevel === 'High Risk' ? '90%' : riskLevel === 'Moderate Risk' ? '50%' : '15%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-Time Alert Log */}
                <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-teal-400" />
                      <span>Alert System Log</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{alertHistory.length} alerts</span>
                  </h3>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 font-mono text-xs">
                    {alertHistory.length === 0 ? (
                      <div className="text-slate-500 text-center py-8">No alerts recorded yet. Start monitoring to generate alerts.</div>
                    ) : (
                      alertHistory.map((log, index) => (
                        <div key={index} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-start gap-2 animate-fadeIn">
                          <span className="text-cyan-400 mt-0.5">▪</span>
                          <span>{log}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 8. DASHBOARD PAGE */}
        {activeTab === 'dashboard' && (
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
        )}

        {/* 10. EYE EXERCISE PAGE */}
        {activeTab === 'exercises' && (
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
        )}

        {/* 16. FUTURE ENHANCEMENTS SECTION */}
        {activeTab === 'future' && (
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
        )}

      </main>

      {/* 17. FOOTER */}
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
              Have questions regarding our AI diagnostic algorithms or commercial healthcare integration?
            </p>
            <a href="mailto:support@smartdryeye.ai" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-semibold transition-all">
              <Mail className="w-4 h-4" />
              <span>support@smartdryeye.ai</span>
            </a>
            <div className="mt-4 text-[10px] text-slate-500">
              © {new Date().getFullYear()} Smart Dry Eye Detection System. All rights reserved.
            </div>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 text-center text-[11px] text-slate-500 leading-relaxed">
          <strong>Medical Disclaimer:</strong> This software is designed for educational, ergonomic, and preliminary screening purposes only. It does not replace professional ophthalmology consultations, clinical tear film evaluations, or formal medical diagnoses. If you experience chronic dry eye, eye pain, or severe vision changes, please consult a certified eye care professional immediately.
        </div>
      </footer>

    </div>
  );
}
