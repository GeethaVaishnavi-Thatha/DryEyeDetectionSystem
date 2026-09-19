import { useCallback, useEffect, useRef, useState } from 'react';

import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import MonitorPage from './components/MonitorPage';
import DashboardPage from './components/DashboardPage';
import ExercisesPage from './components/ExercisesPage';
import AboutPage from './components/AboutPage';
import FuturePage from './components/FuturePage';

import { useEyeTracking } from './hooks/useEyeTracking';
import { assessDryEyeRisk, calculateHealthScore } from './lib/ear';
import type { SessionHistory, TabId } from './types';

/**
 * Owns session state and wiring. Each tab is its own component; everything
 * measured comes from useEyeTracking, which runs MediaPipe against the webcam.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [darkMode, setDarkMode] = useState(true);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [backendMode, setBackendMode] = useState<'browser' | 'python'>('browser');
  const [screenTimeSeconds, setScreenTimeSeconds] = useState(0);
  const [fatigueSeconds, setFatigueSeconds] = useState(0);

  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<string[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionHistory[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Detection ─────────────────────────────────────────────────────────────
  const tracking = useEyeTracking({
    videoRef,
    canvasRef,
    enabled: isMonitoring && backendMode === 'browser',
  });

  const { ear: earValue, blinkRate, faceDetected } = tracking;

  const screenTimeMinutes = screenTimeSeconds / 60;
  // Only score once the detector has actually seen a face this session,
  // otherwise zero blinks reads as a dangerously low blink rate.
  const hasMeasurements = faceDetected || screenTimeSeconds > 0;
  const riskAssessment = assessDryEyeRisk(earValue, blinkRate, screenTimeMinutes);
  const riskLevel = hasMeasurements ? riskAssessment.level : 'Low Risk';
  const aiHealthScore = hasMeasurements
    ? calculateHealthScore(earValue, blinkRate, screenTimeMinutes)
    : 0;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const speakAlert = useCallback((text: string) => {
    if (!voiceAlerts || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // avoid a backlog of queued utterances
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [voiceAlerts]);

  const triggerAlert = useCallback((message: string) => {
    setActiveAlert(message);
    speakAlert(message);
    setAlertHistory(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
    setTimeout(() => setActiveAlert(null), 6000);
  }, [speakAlert]);

  // ── Session timer ─────────────────────────────────────────────────────────
  // Reads values the detector produced; it does not generate them.
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setScreenTimeSeconds(prev => {
        const next = prev + 1;
        const t = trackingRef.current;

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
            triggerAlert('Dry eye risk detected. Please blink more frequently.');
          } else if (next % 1200 === 0) {
            triggerAlert('Screen time alert: time for the 20-20-20 rule.');
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, triggerAlert]);

  // ── Webcam lifecycle ──────────────────────────────────────────────────────
  // The detection loop and canvas drawing live in useEyeTracking.
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
        console.error('Webcam access failed:', err);
        setCameraError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access and start the scanner again.'
            : 'No camera available. Connect a webcam and start the scanner again.',
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

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleResetSession = useCallback(() => {
    tracking.resetSession();
    setScreenTimeSeconds(0);
    setFatigueSeconds(0);
    setSessionLogs([]);
    triggerAlert('Session metrics reset.');
  }, [tracking, triggerAlert]);

  const handleDownloadCSV = useCallback(() => {
    const headers = ['Timestamp', 'EAR_Value', 'Blink_Rate_BPM', 'Screen_Time_Mins', 'Eye_Status', 'Risk_Level'];
    const rows = sessionLogs.map(log => [
      log.timestamp, log.ear, log.blinkRate, log.screenTime, log.status, log.riskLevel,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dry_eye_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sessionLogs]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        voiceAlerts={voiceAlerts}
        setVoiceAlerts={setVoiceAlerts}
        isMonitoring={isMonitoring}
      />

      <AlertBanner activeAlert={activeAlert} setActiveAlert={setActiveAlert} />

      <main className="flex-grow p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'home' && (
          <HomePage
            earValue={earValue}
            blinkRate={blinkRate}
            riskLevel={riskLevel}
            setActiveTab={setActiveTab}
            setIsMonitoring={setIsMonitoring}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitorPage
            tracking={tracking}
            isMonitoring={isMonitoring}
            setIsMonitoring={setIsMonitoring}
            backendMode={backendMode}
            setBackendMode={setBackendMode}
            screenTimeSeconds={screenTimeSeconds}
            fatigueSeconds={fatigueSeconds}
            riskLevel={riskLevel}
            riskAssessment={riskAssessment}
            aiHealthScore={aiHealthScore}
            hasMeasurements={hasMeasurements}
            cameraError={cameraError}
            alertHistory={alertHistory}
            triggerAlert={triggerAlert}
            onReset={handleResetSession}
            videoRef={videoRef}
            canvasRef={canvasRef}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            tracking={tracking}
            screenTimeSeconds={screenTimeSeconds}
            riskLevel={riskLevel}
            riskAssessment={riskAssessment}
            aiHealthScore={aiHealthScore}
            hasMeasurements={hasMeasurements}
            sessionLogs={sessionLogs}
            handleDownloadCSV={handleDownloadCSV}
          />
        )}

        {activeTab === 'exercises' && <ExercisesPage speakAlert={speakAlert} />}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'future' && <FuturePage />}
      </main>

      <Footer />
    </div>
  );
}
