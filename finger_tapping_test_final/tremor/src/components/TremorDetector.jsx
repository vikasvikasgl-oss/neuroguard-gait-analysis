import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config.js';
import { analyzeFaceMovement } from '../utils/signalProcessing.js';
import { CLINICAL_REGIONS } from '../utils/landmarkGroups.js';
import NeurologicalBackground from './NeurologicalBackground.jsx';
import SpectrumChart from './SpectrumChart.jsx';
import LiveWaveform from './LiveWaveform.jsx';

export default function TremorDetector({ onBack }) {
  const [appState, setAppState] = useState('INIT'); // INIT, CAMERA_READY, ANALYZING, RESULT, ERROR
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(CONFIG.RECORDING_DURATION_SEC || 10);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [fps, setFps] = useState(30);
  const [liveStability, setLiveStability] = useState({ isCentered: false, stabilityScore: 100 });
  const [liveWaveformPoints, setLiveWaveformPoints] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'spectrum'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const landmarkerRef = useRef(null);
  const frameRequestRef = useRef(null);
  const recordingDataRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const smoothedLandmarksRef = useRef(null);
  const prevCenterRef = useRef(null);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    async function initMediaPipe() {
      try {
        setModelLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        setModelLoading(false);
      } catch (err) {
        console.error('Failed to load vision model:', err);
        setErrorMessage('Could not load the face tracking model. Please check your network connection.');
        setAppState('ERROR');
        setModelLoading(false);
      }
    }
    initMediaPipe();

    return () => {
      if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
    };
  }, []);

  // Enable Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setAppState('CAMERA_READY');
          startTrackingLoop();
        };
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setErrorMessage('Camera access was not granted. Please allow camera permissions in your browser.');
      setAppState('ERROR');
    }
  };

  // Main Tracking Loop
  const startTrackingLoop = () => {
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const processFrame = () => {
      if (videoRef.current && landmarkerRef.current && videoRef.current.readyState >= 2) {
        const now = performance.now();
        frameCount++;
        if (now - lastFpsTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
          frameCount = 0;
          lastFpsTime = now;
        }

        const results = landmarkerRef.current.detectForVideo(videoRef.current, now);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx && canvas) {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const rawLandmarks = results.faceLandmarks[0];

            // Temporal Smoothing (EMA) for visual dots
            const alpha = 0.35;
            let currentSmoothed = [];

            if (!smoothedLandmarksRef.current || smoothedLandmarksRef.current.length !== rawLandmarks.length) {
              currentSmoothed = rawLandmarks;
            } else {
              currentSmoothed = rawLandmarks.map((pt, idx) => {
                const prev = smoothedLandmarksRef.current[idx];
                return {
                  x: alpha * pt.x + (1 - alpha) * prev.x,
                  y: alpha * pt.y + (1 - alpha) * prev.y,
                  z: alpha * pt.z + (1 - alpha) * prev.z,
                };
              });
            }
            smoothedLandmarksRef.current = currentSmoothed;

            // Centering & stability estimation
            const eyeL = currentSmoothed[33];
            const eyeR = currentSmoothed[263];
            const faceCenterX = (eyeL.x + eyeR.x) / 2;
            const faceCenterY = (eyeL.y + eyeR.y) / 2;
            const faceWidth = Math.abs(eyeR.x - eyeL.x);

            const isCentered =
              faceCenterX > 0.35 && faceCenterX < 0.65 && faceCenterY > 0.25 && faceCenterY < 0.75 && faceWidth > 0.12;

            let delta = 0;
            if (prevCenterRef.current) {
              delta = Math.hypot(
                faceCenterX - prevCenterRef.current.x,
                faceCenterY - prevCenterRef.current.y
              );
            }
            prevCenterRef.current = { x: faceCenterX, y: faceCenterY };
            const stability = Math.max(0, Math.min(100, Math.round(100 - delta * 1800)));

            setLiveStability({ isCentered, stabilityScore: stability });

            // 1. Subtle Face Alignment Oval
            if (appState === 'CAMERA_READY') {
              const ovalX = canvas.width * 0.5;
              const ovalY = canvas.height * 0.48;
              const radiusX = canvas.width * 0.22;
              const radiusY = canvas.height * 0.36;

              ctx.strokeStyle = isCentered ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.ellipse(ovalX, ovalY, radiusX, radiusY, 0, 0, 2 * Math.PI);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // 2. Render Clean, Subtle Landmark Points
            const targetIndices = new Set([
              61, 291, 0, 17, 13, 14, 37, 267, 84, 314, // Lips
              152, 148, 175, 199, 200, 176,              // Chin
              159, 145, 160, 144, 386, 374,              // Eyelids
              70, 63, 105, 66, 300, 293,                 // Eyebrows
              172, 397, 136, 365                         // Jaw
            ]);

            currentSmoothed.forEach((pt, idx) => {
              if (targetIndices.has(idx)) {
                ctx.fillStyle = '#60A5FA';
                ctx.beginPath();
                ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 1.8, 0, 2 * Math.PI);
                ctx.fill();
              } else if (idx % 5 === 0) {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.beginPath();
                ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 0.9, 0, 2 * Math.PI);
                ctx.fill();
              }
            });

            // 3. Record High-Precision Raw Data
            if (recordingStartTimeRef.current !== null) {
              recordingDataRef.current.push({
                timestamp: now,
                landmarks: rawLandmarks,
              });

              const lipDy = Math.abs(rawLandmarks[13].y - rawLandmarks[14].y);
              setLiveWaveformPoints((prev) => [...prev.slice(-120), lipDy]);
            }
          }
        }
      }
      frameRequestRef.current = requestAnimationFrame(processFrame);
    };

    frameRequestRef.current = requestAnimationFrame(processFrame);
  };

  // Start 10-Second Analysis Window
  const handleStartAnalysis = () => {
    recordingDataRef.current = [];
    recordingStartTimeRef.current = performance.now();
    setLiveWaveformPoints([]);
    setAppState('ANALYZING');
    const duration = CONFIG.RECORDING_DURATION_SEC || 10;
    setCountdown(duration);

    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          processRecordedData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Process Recorded Frames
  const processRecordedData = () => {
    recordingStartTimeRef.current = null;
    const rawFrames = recordingDataRef.current;
    const minFrames = CONFIG.MIN_REQUIRED_FRAMES || 100;

    if (!rawFrames || rawFrames.length < minFrames) {
      setErrorMessage('Could not complete scan. Please keep your face in view and try again.');
      setAppState('ERROR');
      return;
    }

    const result = analyzeFaceMovement(rawFrames);

    if (result.isExcessiveHeadMotion) {
      setErrorMessage('Excessive head movement was detected. Please keep your head steady and try again.');
      setAppState('ERROR');
      return;
    }

    setAnalysisResult(result);
    setAppState('RESULT');
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setErrorMessage('');
    setLiveWaveformPoints([]);
    setAppState('CAMERA_READY');
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        tremorDetected: analysisResult.hasTremor ? 'YES' : 'NO',
        score: `${analysisResult.score}%`,
        classification: analysisResult.severityLevel,
        dominantFrequency: `${analysisResult.dominantFrequency} Hz`,
        snr: analysisResult.snr,
      },
      regionalBreakdown: analysisResult.regions.map((r) => ({
        region: r.name,
        score: `${r.score}%`,
        dominantFrequency: `${r.dominantFreq} Hz`,
        snr: r.snr,
        rhythmicity: `${r.rhythmicity}%`,
      })),
      notes: 'Calibrated relative to initial 1-second baseline position.',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tremor-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.appContainer}>
      <NeurologicalBackground />

      <div style={styles.mainWrapper} className="animate-fade-in-up">
        {/* Clean Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && (
              <button 
                onClick={onBack}
                style={{
                  backgroundColor: '#1F2937',
                  color: '#CBD5E1',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  marginRight: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Dashboard
              </button>
            )}
            <div>
              <h1 style={styles.title}>Facial Tremor Detector</h1>
              <p style={styles.subtitle}>
                10-Second Movement & Frequency Analysis (3.5 – 7.5 Hz)
              </p>
            </div>
          </div>

          <div style={styles.headerStatus}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: modelLoading ? '#F59E0B' : '#10B981',
              }}
              className={modelLoading ? 'animate-pulse-glow' : ''}
            />
            <span style={styles.statusText}>
              {modelLoading ? 'Loading model...' : 'Camera ready'}
            </span>
          </div>
        </header>

        {/* Main Grid */}
        <div style={styles.contentGrid}>
          {/* Left: Video Viewport */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Camera Feed</span>
              <div style={styles.metaRow}>
                <span style={styles.metaBadge}>{fps} fps</span>
                <span style={styles.metaText}>
                  Stability: <strong>{liveStability.stabilityScore}%</strong>
                </span>
              </div>
            </div>

            {/* Video Stage */}
            <div style={styles.stageContainer}>
              <video ref={videoRef} autoPlay playsInline muted style={styles.videoElement} />
              <canvas ref={canvasRef} style={styles.canvasElement} />

              {/* Smooth Scanner Beam during active scan */}
              {appState === 'ANALYZING' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)',
                    animation: 'scanline 2.5s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Start Camera Overlay */}
              {appState === 'INIT' && (
                <div style={styles.overlayBox} className="animate-scale-in">
                  <h3 style={styles.overlayHeading}>Start Assessment</h3>
                  <p style={styles.overlayDescription}>
                    Position yourself in comfortable lighting with your face centered in the frame.
                  </p>
                  <button
                    className="btn-smooth"
                    style={styles.primaryButton}
                    onClick={startCamera}
                    disabled={modelLoading}
                  >
                    {modelLoading ? 'Loading model...' : 'Enable Camera'}
                  </button>
                </div>
              )}

              {/* Recording Overlay */}
              {appState === 'ANALYZING' && (
                <div style={styles.recordingPill} className="animate-scale-in">
                  <span
                    style={{
                      ...styles.recordDot,
                      backgroundColor: '#3B82F6',
                    }}
                    className="animate-pulse-glow"
                  />
                  <span>
                    Analyzing facial tremor: {countdown}s remaining
                  </span>
                </div>
              )}
            </div>

            {/* Real-time Oscilloscope */}
            {appState === 'ANALYZING' && (
              <div style={{ padding: '12px 16px 0 16px' }} className="animate-fade-in-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Live Micro-Displacement Waveform
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Real-time</span>
                </div>
                <LiveWaveform dataPoints={liveWaveformPoints} />
              </div>
            )}

            {/* Controls */}
            <div style={styles.toolbar}>
              {appState === 'CAMERA_READY' && (
                <button className="btn-smooth" style={styles.primaryButton} onClick={handleStartAnalysis}>
                  Start 10-Second Scan
                </button>
              )}

              {appState === 'ANALYZING' && (
                <div style={{ width: '100%' }}>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${((CONFIG.RECORDING_DURATION_SEC - countdown) / CONFIG.RECORDING_DURATION_SEC) * 100}%`,
                        backgroundColor: '#3B82F6',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                  <p style={styles.recordingHint}>
                    Scanning facial micro-movements... please hold steady
                  </p>
                </div>
              )}

              {appState === 'ERROR' && (
                <div style={styles.errorBox} className="animate-fade-in-up">
                  <p style={styles.errorMsg}>{errorMessage}</p>
                  <button className="btn-smooth" style={styles.secondaryButton} onClick={handleReset}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Results Dashboard */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Analysis Results</span>
              {analysisResult && (
                <button className="btn-smooth" style={styles.textButton} onClick={handleDownloadReport}>
                  Download JSON
                </button>
              )}
            </div>

            {analysisResult ? (
              <div style={styles.resultsContent} className="animate-fade-in-up">
                {/* Result Status Box */}
                <div
                  className="animate-scale-in"
                  style={{
                    ...styles.verdictBox,
                    borderColor: analysisResult.hasTremor ? '#EF4444' : '#10B981',
                    backgroundColor: analysisResult.hasTremor ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    transition: 'all 0.4s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={styles.verdictLabel}>VERDICT</span>
                      <h2
                        style={{
                          ...styles.verdictHeading,
                          color: analysisResult.hasTremor ? '#F87171' : '#34D399',
                        }}
                      >
                        {analysisResult.hasTremor ? 'Tremor Detected: YES' : 'Tremor Detected: NO'}
                      </h2>
                      <span
                        style={{
                          ...styles.verdictBadge,
                          color: analysisResult.hasTremor ? '#FCA5A5' : '#86EFAC',
                        }}
                      >
                        {analysisResult.severityLevel}
                      </span>
                    </div>

                    <div style={styles.scoreContainer}>
                      <span style={styles.scoreValue}>{analysisResult.score}%</span>
                      <span style={styles.scoreLabel}>Score</span>
                    </div>
                  </div>
                </div>

                {/* Primary Metrics Grid */}
                <div style={styles.metricsGrid}>
                  <div style={styles.metricItem}>
                    <span style={styles.metricLabel}>Dominant Frequency</span>
                    <span style={styles.metricValue}>
                      {analysisResult.dominantFrequency > 0 ? `${analysisResult.dominantFrequency} Hz` : 'None'}
                    </span>
                    <span style={styles.metricHint}>Target: 3.5 – 7.5 Hz</span>
                  </div>

                  <div style={styles.metricItem}>
                    <span style={styles.metricLabel}>Signal-to-Noise Ratio</span>
                    <span style={styles.metricValue}>{analysisResult.snr}x</span>
                    <span style={styles.metricHint}>vs 1s baseline floor</span>
                  </div>
                </div>

                {/* Tabs */}
                <div style={styles.tabContainer}>
                  <button
                    className="btn-smooth"
                    style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
                    onClick={() => setActiveTab('overview')}
                  >
                    Regional Breakdown
                  </button>
                  <button
                    className="btn-smooth"
                    style={{ ...styles.tab, ...(activeTab === 'spectrum' ? styles.tabActive : {}) }}
                    onClick={() => setActiveTab('spectrum')}
                  >
                    Frequency Spectrum
                  </button>
                </div>

                {/* Tab 1: Regional Breakdown */}
                {activeTab === 'overview' && (
                  <div style={styles.regionList}>
                    {analysisResult.regions.map((region) => (
                      <div key={region.id} style={styles.regionRow}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: '500' }}>
                            {region.name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: region.hasLocalTremor ? '#F87171' : '#94A3B8' }}>
                            {region.score}% {region.hasLocalTremor ? '(Oscillatory)' : '(Stable)'}
                          </span>
                        </div>

                        <div style={styles.meterBg}>
                          <div
                            style={{
                              ...styles.meterFill,
                              width: `${region.score}%`,
                              backgroundColor: region.hasLocalTremor ? '#EF4444' : '#3B82F6',
                              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          />
                        </div>

                        <div style={styles.regionSubText}>
                          <span>Peak: {region.dominantFreq > 0 ? `${region.dominantFreq} Hz` : 'N/A'}</span>
                          <span>Rhythmicity: {region.rhythmicity}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 2: Spectrum Chart */}
                {activeTab === 'spectrum' && (
                  <div className="animate-fade-in-up">
                    <SpectrumChart
                      spectrumData={analysisResult.spectrumData}
                      dominantFrequency={analysisResult.dominantFrequency}
                      title="Relative Power Spectral Density"
                    />
                  </div>
                )}

                {/* Footer Action */}
                <div style={{ marginTop: '16px' }}>
                  <button className="btn-smooth" style={styles.secondaryButton} onClick={handleReset}>
                    Perform Another Scan
                  </button>
                </div>
              </div>
            ) : (
              /* Awaiting Scan State */
              <div style={styles.emptyContainer}>
                <div style={styles.emptyIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h4 style={{ color: '#E2E8F0', margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '600' }}>
                  Ready to scan
                </h4>
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0 0 16px 0', maxWidth: '300px', lineHeight: 1.5 }}>
                  Click <strong>"Start 10-Second Scan"</strong> to analyze resting facial movement.
                </p>
                <div style={styles.tipBox}>
                  <span style={{ fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                    <strong>Protocol:</strong> Look comfortably at the camera. The system tracks spatial displacement and rhythmicity across facial zones with sub-pixel deadband filtering.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <footer style={styles.footer}>
          <p style={styles.disclaimer}>
            For educational and research evaluation only. An optical oscillation score does not constitute a clinical diagnosis.
          </p>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0B0F19',
    color: '#F8FAFC',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 16px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: '1100px',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#111827',
    borderRadius: '10px',
    border: '1px solid #1F2937',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: '0.82rem',
    color: '#9CA3AF',
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1F2937',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #374151',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '0.78rem',
    color: '#D1D5DB',
    fontWeight: '500',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
    gap: '16px',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: '10px',
    border: '1px solid #1F2937',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '480px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    borderBottom: '1px solid #1F2937',
    backgroundColor: '#111827',
  },
  cardTitle: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#E5E7EB',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  metaBadge: {
    fontSize: '0.72rem',
    color: '#9CA3AF',
    backgroundColor: '#1F2937',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
  },
  metaText: {
    fontSize: '0.78rem',
    color: '#9CA3AF',
  },
  stageContainer: {
    position: 'relative',
    width: '100%',
    height: '380px',
    backgroundColor: '#030712',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  canvasElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: 'scaleX(-1)',
  },
  overlayBox: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '360px',
    border: '1px solid #374151',
  },
  overlayHeading: {
    margin: '0 0 6px 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#F9FAFB',
  },
  overlayDescription: {
    margin: '0 0 16px 0',
    fontSize: '0.85rem',
    color: '#9CA3AF',
    lineHeight: 1.5,
  },
  recordingPill: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    border: '1px solid #374151',
    color: '#F9FAFB',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.78rem',
    fontWeight: '500',
  },
  recordDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  toolbar: {
    padding: '16px 18px',
    borderTop: '1px solid #1F2937',
    display: 'flex',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    color: '#E5E7EB',
    border: '1px solid #374151',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
  },
  textButton: {
    backgroundColor: 'transparent',
    color: '#60A5FA',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#1F2937',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  recordingHint: {
    margin: '8px 0 0 0',
    fontSize: '0.82rem',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: '0.85rem',
    color: '#FCA5A5',
    margin: '0 0 10px 0',
  },
  resultsContent: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  verdictBox: {
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid',
  },
  verdictLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: '0.04em',
  },
  verdictHeading: {
    margin: '2px 0 4px 0',
    fontSize: '1.3rem',
    fontWeight: '700',
  },
  verdictBadge: {
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  scoreContainer: {
    textAlign: 'right',
  },
  scoreValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#F9FAFB',
    display: 'block',
  },
  scoreLabel: {
    fontSize: '0.72rem',
    color: '#9CA3AF',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  metricItem: {
    backgroundColor: '#1F2937',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '0.72rem',
    color: '#9CA3AF',
  },
  metricValue: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#F9FAFB',
  },
  metricHint: {
    fontSize: '0.7rem',
    color: '#6B7280',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #1F2937',
    paddingBottom: '4px',
    marginTop: '4px',
  },
  tab: {
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    border: 'none',
    padding: '6px 10px',
    fontSize: '0.82rem',
    fontWeight: '500',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  tabActive: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
  },
  regionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  regionRow: {
    backgroundColor: '#1F2937',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #374151',
  },
  meterBg: {
    width: '100%',
    height: '4px',
    backgroundColor: '#374151',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  meterFill: {
    height: '100%',
    borderRadius: '2px',
  },
  regionSubText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    color: '#9CA3AF',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    flex: 1,
    padding: '30px 20px',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1F2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    border: '1px solid #374151',
  },
  tipBox: {
    backgroundColor: '#1F2937',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #374151',
    maxWidth: '340px',
    textAlign: 'left',
  },
  footer: {
    textAlign: 'center',
    padding: '4px 12px',
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: '#6B7280',
    margin: 0,
  },
};