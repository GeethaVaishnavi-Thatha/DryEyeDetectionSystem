import { Activity, AlertTriangle, Bell, Clock, Eye, Pause, Play, RotateCcw, Video } from 'lucide-react';
import { CALIBRATION_SECONDS, type EyeTrackingResult } from '../hooks/useEyeTracking';
import type { RiskLevel } from '../lib/ear';

interface Props {
  tracking: EyeTrackingResult;
  isMonitoring: boolean;
  setIsMonitoring: (on: boolean) => void;
  backendMode: 'browser' | 'python';
  setBackendMode: (m: 'browser' | 'python') => void;
  screenTimeSeconds: number;
  fatigueSeconds: number;
  riskLevel: RiskLevel;
  riskAssessment: { level: RiskLevel; score: number };
  aiHealthScore: number;
  hasMeasurements: boolean;
  cameraError: string | null;
  alertHistory: string[];
  triggerAlert: (message: string) => void;
  onReset: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function MonitorPage({
  tracking, isMonitoring, setIsMonitoring, backendMode, setBackendMode,
  screenTimeSeconds, fatigueSeconds, riskLevel, riskAssessment, aiHealthScore,
  hasMeasurements, cameraError, alertHistory, triggerAlert, onReset,
  videoRef, canvasRef,
}: Props) {
  const { ear: earValue, eyeStatus, blinkCount, blinkRate, faceDetected, modelState, fps } = tracking;

  return (
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
            onClick={onReset}
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
                  <span className="text-xs text-slate-400 font-mono">
                    {hasMeasurements ? `score ${riskAssessment.score}/7` : 'no data'}
                  </span>
                </div>
                {/* Risk Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${riskLevel === 'High Risk' ? 'bg-red-500' : riskLevel === 'Moderate Risk' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${hasMeasurements ? Math.round((riskAssessment.score / 7) * 100) : 0}%` }}
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
  );
}
