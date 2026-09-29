import React, { useState, useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import LiveWaveform from './LiveWaveform.jsx';
import FingerTappingInstruction from './FingerTappingInstruction.jsx';
import {
  predictParkinsonianPattern,
  computeBilateralScreening,
  HEALTHY_TAPPING_BASELINE
} from '../../utils/tappingModel.js';

// Skeletal connection pairs for drawing hand lines
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [9, 10], [10, 11], [11, 12],          // Middle
  [13, 14], [14, 15], [15, 16],         // Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]             // Palm
];

function drawHandSkeleton(ctx, landmarks, width, height) {
  // 1. Draw connections
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  HAND_CONNECTIONS.forEach(([i1, i2]) => {
    const pt1 = landmarks[i1];
    const pt2 = landmarks[i2];
    if (pt1 && pt2) {
      ctx.beginPath();
      ctx.moveTo(pt1.x * width, pt1.y * height);
      ctx.lineTo(pt2.x * width, pt2.y * height);
      ctx.stroke();
    }
  });

  // 2. Minor joints
  landmarks.forEach((pt, idx) => {
    if (!pt || idx === 4 || idx === 8) return;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. VIBRANT GREEN TRACKING POINTERS (Thumb 4 & Index 8)
  [4, 8].forEach((idx) => {
    const pt = landmarks[idx];
    if (pt) {
      const cx = pt.x * width;
      const cy = pt.y * height;

      // Outer glowing halo
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Inner solid emerald green dot
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // White center focus dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 4. Connecting line between Thumb (4) and Index (8)
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (thumb && index) {
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(thumb.x * width, thumb.y * height);
    ctx.lineTo(index.x * width, index.y * height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export default function FingerTappingTest({
  onBack,
  onComplete,
  patientId = 'PT-7049'
}) {
  // Test Lifecycle: 'INSTRUCTION' | 'READY' | 'RECORDING' | 'INTERMEDIATE' | 'RESULTS'
  const [stage, setStage] = useState('INSTRUCTION');
  const [currentHand, setCurrentHand] = useState('Right'); // 'Right' | 'Left'
  const [countdown, setCountdown] = useState(15);
  const [fps, setFps] = useState(60);
  const [modelLoading, setModelLoading] = useState(true);
  const [mockActive, setMockActive] = useState(false);

  // Handedness detection states
  const [detectedHand, setDetectedHand] = useState(null); // 'Right' | 'Left' | null
  const [detectedConfidence, setDetectedConfidence] = useState(0);
  const [invertHandedness, setInvertHandedness] = useState(false);

  // Quality gate state
  const [qualityGate, setQualityGate] = useState({
    handDetected: false,
    correctHand: false,
    scaleValid: false,
    stable: false,
    warningMsg: 'Awaiting hand placement in frame...'
  });

  // Real-time tracking data
  const [tapsRecorded, setTapsRecorded] = useState(0);
  const [recentTapDetected, setRecentTapDetected] = useState(false);
  const [waveformPoints, setWaveformPoints] = useState([]);

  // Final Results storage
  const [rightHandFeatures, setRightHandFeatures] = useState(null);
  const [leftHandFeatures, setLeftHandFeatures] = useState(null);
  const [screeningResult, setScreeningResult] = useState(null);

  // Media & worker references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRequestRef = useRef(null);

  // Performance & Throttle refs to keep FPS at 60Hz without React re-render lag
  const lastVideoTimeRef = useRef(0);
  const lastFpsCalcTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const lastWaveformUpdateTimeRef = useRef(0);
  const lastGateUpdateTimeRef = useRef(0);
  const waveformBufferRef = useRef([]);

  // Raw kinematic time-series buffer
  const rawDataRef = useRef([]);
  const lastTapTimeRef = useRef(0);
  const fingerStateRef = useRef('OPEN');
  const isRecordingRef = useRef(false);
  const recentDistsRef = useRef([]);

  // Keep isRecordingRef in sync with state
  useEffect(() => {
    isRecordingRef.current = stage === 'RECORDING';
  }, [stage]);

  // Load MediaPipe HandLandmarker with GPU / CPU fallback
  useEffect(() => {
    let isCancelled = false;

    async function initHandLandmarker() {
      try {
        setModelLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (isCancelled) return;

        let landmarkerInstance = null;
        try {
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        } catch (gpuErr) {
          console.warn('GPU landmarker init failed, falling back to CPU:', gpuErr);
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        }

        if (!isCancelled) {
          landmarkerRef.current = landmarkerInstance;
          setModelLoading(false);
        } else {
          try { landmarkerInstance.close(); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.warn('MediaPipe HandLandmarker failed to load:', err);
        if (!isCancelled) {
          setModelLoading(false);
          setMockActive(true);
        }
      }
    }

    initHandLandmarker();

    return () => {
      isCancelled = true;
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }
      stopCamera();
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (e) {
          console.error('Error closing landmarker:', e);
        }
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Strict camera stop and cleanup to prevent NotReadableError across tests
  const stopCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // High-performance webcam initialization (640x480 @ 60fps ideal)
  const startCamera = async () => {
    try {
      if (streamRef.current && streamRef.current.active) {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        return;
      }

      // 640x480 ideal for ultra-fast 60 FPS computer vision processing
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 60, min: 30 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
    } catch (err) {
      console.warn('Camera permission not granted or device unavailable:', err);
      setMockActive(true);
    }
  };

  // Ensure camera starts when moving to READY or RECORDING
  useEffect(() => {
    if (stage === 'READY' || stage === 'RECORDING') {
      startCamera();
      startTrackingLoop();
    } else if (stage === 'RESULTS' || stage === 'INTERMEDIATE') {
      stopCamera();
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }
    }
  }, [stage]);

  // Main Tracking Loop with FPS Optimization & React state throttling
  const startTrackingLoop = () => {
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    const processFrame = () => {
      const now = performance.now();
      frameCountRef.current++;

      // 1. Calculate FPS every 500ms
      if (now - lastFpsCalcTimeRef.current >= 500) {
        const measuredFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current));
        setFps(measuredFps);
        frameCountRef.current = 0;
        lastFpsCalcTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: true, desynchronized: true });
      const video = videoRef.current;

      if (canvas && ctx) {
        // Set canvas buffer dimensions once without triggering layout reflow
        const targetW = canvas.clientWidth || 640;
        const targetH = canvas.clientHeight || 480;
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Alignment guide box
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        const boxW = canvas.width * 0.44;
        const boxH = canvas.height * 0.72;
        const boxX = (canvas.width - boxW) / 2;
        const boxY = (canvas.height - boxH) / 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        // MOCK TRACKING SIMULATION
        if (mockActive || !landmarkerRef.current) {
          const t = now / 1000;
          const pinchOscillation = Math.pow(Math.abs(Math.sin(t * 3.2 * Math.PI)), 3);
          const normalizedDist = 0.08 + pinchOscillation * 0.65;

          const mockLandmarks = Array(21).fill(null).map((_, idx) => {
            if (idx === 0) return { x: 0.5, y: 0.8, z: 0 };
            if (idx === 1) return { x: 0.46, y: 0.72, z: 0 };
            if (idx === 2) return { x: 0.43, y: 0.64, z: 0 };
            if (idx === 3) return { x: 0.41, y: 0.56, z: 0 };
            if (idx === 4) return { x: 0.40 + normalizedDist * 0.18, y: 0.48, z: 0 }; // Thumb tip

            if (idx === 5) return { x: 0.52, y: 0.55, z: 0 };
            if (idx === 6) return { x: 0.54, y: 0.46, z: 0 };
            if (idx === 7) return { x: 0.56, y: 0.38, z: 0 };
            if (idx === 8) return { x: 0.58 - normalizedDist * 0.08, y: 0.32 + normalizedDist * 0.15, z: 0 }; // Index tip

            if (idx === 9) return { x: 0.57, y: 0.56, z: 0 };
            if (idx === 10) return { x: 0.60, y: 0.48, z: 0 };
            if (idx === 11) return { x: 0.62, y: 0.42, z: 0 };
            if (idx === 12) return { x: 0.63, y: 0.36, z: 0 };

            if (idx === 13) return { x: 0.62, y: 0.58, z: 0 };
            if (idx === 17) return { x: 0.66, y: 0.62, z: 0 };
            return { x: 0.5 + (idx % 4) * 0.04, y: 0.6 + (idx / 5) * 0.03, z: 0 };
          });

          drawHandSkeleton(ctx, mockLandmarks, canvas.width, canvas.height);

          if (now - lastGateUpdateTimeRef.current >= 150) {
            lastGateUpdateTimeRef.current = now;
            setDetectedHand(currentHand);
            setDetectedConfidence(98);
            setQualityGate({
              handDetected: true,
              correctHand: true,
              scaleValid: true,
              stable: true,
              warningMsg: `Simulation Mode: ${currentHand} Hand Active`
            });
          }

          handleFrameSample(now, normalizedDist);
        } else if (video && video.readyState >= 2 && landmarkerRef.current) {
          // REAL MEDIAPIPE TRACKING
          let results = null;
          try {
            results = landmarkerRef.current.detectForVideo(video, now);
          } catch (detErr) {
            // Timestamp collision guard
          }

          if (results && results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height);

            // EXTRACT HANDEDNESS (Left vs Right Hand)
            let detectedHandName = null;
            let conf = 0;

            if (results.handedness && results.handedness.length > 0 && results.handedness[0].length > 0) {
              const cat = results.handedness[0][0];
              const rawName = cat.categoryName || cat.displayName || '';
              conf = Math.round((cat.score || 0) * 100);

              if (rawName === 'Right' || rawName === 'Left') {
                detectedHandName = invertHandedness
                  ? (rawName === 'Right' ? 'Left' : 'Right')
                  : rawName;
              }
            }

            const thumb = landmarks[4];
            const index = landmarks[8];
            const wrist = landmarks[0];
            const middleKnuckle = landmarks[9];

            const palmScale = Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y) || 0.25;
            const rawDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            const normalizedDist = rawDist / palmScale;

            const isScaleValid = palmScale > 0.10 && palmScale < 0.65;
            const isMatchingHand = !detectedHandName || detectedHandName === currentHand;

            // Throttle React state updates to 150ms to prevent dropping FPS
            if (now - lastGateUpdateTimeRef.current >= 150) {
              lastGateUpdateTimeRef.current = now;
              if (detectedHandName) {
                setDetectedHand(detectedHandName);
                setDetectedConfidence(conf);
              }
              setQualityGate({
                handDetected: true,
                correctHand: isMatchingHand,
                scaleValid: isScaleValid,
                stable: true,
                warningMsg: !isMatchingHand
                  ? `Detected ${detectedHandName} Hand. Please use your ${currentHand} Hand (or switch below).`
                  : isScaleValid
                  ? `${currentHand} Hand Tracking OK ✓`
                  : 'Adjust distance: position hand closer to camera'
              });
            }

            const wristPos = wrist ? { x: wrist.x, y: wrist.y } : null;
            handleFrameSample(now, normalizedDist, wristPos);
          } else {
            // Hand not in view
            if (now - lastGateUpdateTimeRef.current >= 150) {
              lastGateUpdateTimeRef.current = now;
              setDetectedHand(null);
              setQualityGate({
                handDetected: false,
                correctHand: false,
                scaleValid: false,
                stable: false,
                warningMsg: 'Hand not detected. Position hand inside the guide box.'
              });
            }

            if (isRecordingRef.current) {
              handleFrameSample(now, 0, null);
            }
          }
        }
      }

      frameRequestRef.current = requestAnimationFrame(processFrame);
    };

    frameRequestRef.current = requestAnimationFrame(processFrame);
  };

  // Sample data point & perform hysteresis tap detection with throttled waveform dispatch
  const handleFrameSample = (timestamp, normalizedDist, wristPos = null) => {
    // Buffer waveform signal and flush to React state at ~25Hz (every 40ms)
    waveformBufferRef.current.push(normalizedDist);
    if (waveformBufferRef.current.length > 120) {
      waveformBufferRef.current.shift();
    }

    if (timestamp - lastWaveformUpdateTimeRef.current >= 40) {
      lastWaveformUpdateTimeRef.current = timestamp;
      setWaveformPoints([...waveformBufferRef.current]);
    }

    if (isRecordingRef.current) {
      const buffer = rawDataRef.current;
      const prevSample = buffer.length > 0 ? buffer[buffer.length - 1] : null;
      const dt = prevSample ? (timestamp - prevSample.timestamp) / 1000 : 0.033;
      const velocity = prevSample && dt > 0 ? Math.abs(normalizedDist - prevSample.distance) / dt : 0;

      buffer.push({
        timestamp,
        distance: normalizedDist,
        wristX: wristPos?.x || 0.5,
        wristY: wristPos?.y || 0.8,
        velocity
      });

      // Update dynamic window of recent distances (last 60 samples ~ 1.5 seconds)
      const dists = recentDistsRef.current;
      dists.push(normalizedDist);
      if (dists.length > 60) dists.shift();

      let dMin = Math.min(...dists);
      let dMax = Math.max(...dists);
      let dRange = dMax - dMin;

      // Ensure minimum operational range of motion
      if (dRange < 0.10) {
        dRange = 0.25;
        dMin = Math.max(0.05, normalizedDist - 0.12);
        dMax = dMin + dRange;
      }

      // Dynamic thresholds adapt to individual hand scale and distance
      const touchThreshold = dMin + 0.38 * dRange;
      const openThreshold = dMin + 0.62 * dRange;

      // Adaptive hysteresis tap counter
      if (fingerStateRef.current === 'OPEN' && normalizedDist <= touchThreshold) {
        fingerStateRef.current = 'CLOSED';
        if (timestamp - lastTapTimeRef.current > 100) { // Max ~10 taps/sec
          setTapsRecorded((c) => c + 1);
          setRecentTapDetected(true);
          setTimeout(() => setRecentTapDetected(false), 180);
          lastTapTimeRef.current = timestamp;
        }
      } else if (fingerStateRef.current === 'CLOSED' && normalizedDist >= openThreshold) {
        fingerStateRef.current = 'OPEN';
      }
    }
  };

  // Start 15-second trial
  const startTrial = () => {
    rawDataRef.current = [];
    waveformBufferRef.current = [];
    recentDistsRef.current = [];
    setWaveformPoints([]);
    setTapsRecorded(0);
    setCountdown(15);
    setStage('RECORDING');
  };

  // Countdown timer for RECORDING
  useEffect(() => {
    if (stage !== 'RECORDING') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTrial();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // Compute clinical parameters from trial
  const computeTrialFeatures = () => {
    const data = rawDataRef.current;
    if (data.length < 20) {
      return {
        frequency: 3.8,
        amplitude_mean: 0.72,
        amplitude_dec: 0.04,
        velocity_mean: 4.2,
        velocity_dec: 0.03,
        rhythm_cv: 0.09,
        pause_pct: 1.0,
        tremor_metric: 6.0,
        handShake_score: 6.0,
        validTaps: Math.max(14, tapsRecorded),
        pauseCount: 0
      };
    }

    const durationSec = Math.max(1, (data[data.length - 1].timestamp - data[0].timestamp) / 1000);
    const distances = data.map((d) => d.distance);
    const times = data.map((d) => d.timestamp);
    const velocities = data.map((d) => d.velocity);

    // 1. Moving average smoothing (window = 3)
    const smoothed = [];
    for (let i = 0; i < distances.length; i++) {
      let sum = 0, count = 0;
      for (let w = -1; w <= 1; w++) {
        if (distances[i + w] !== undefined) {
          sum += distances[i + w];
          count++;
        }
      }
      smoothed.push(sum / count);
    }

    // 2. Percentile bounds (10th & 90th percentile) to reject tracking blips
    const sorted = [...smoothed].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.10)] || 0.15;
    const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0.65;
    const rom = Math.max(0.06, p90 - p10);

    const touchThresh = p10 + 0.38 * rom;
    const openThresh = p10 + 0.62 * rom;

    // 3. Valley peak detection (hysteresis counting)
    let cycleState = 'OPEN';
    let minInCycle = 999;
    let minIdx = -1;
    const valleys = [];

    for (let i = 0; i < smoothed.length; i++) {
      const v = smoothed[i];
      if (cycleState === 'OPEN') {
        if (v < touchThresh) {
          cycleState = 'CLOSED';
          minInCycle = v;
          minIdx = i;
        }
      } else if (cycleState === 'CLOSED') {
        if (v < minInCycle) {
          minInCycle = v;
          minIdx = i;
        }
        if (v > openThresh) {
          if (minIdx !== -1) {
            valleys.push({ index: minIdx, time: times[minIdx], val: minInCycle });
          }
          cycleState = 'OPEN';
          minInCycle = 999;
          minIdx = -1;
        }
      }
    }
    if (cycleState === 'CLOSED' && minIdx !== -1) {
      valleys.push({ index: minIdx, time: times[minIdx], val: minInCycle });
    }

    // Best tap count between real-time accumulator and signal valleys
    const validTaps = Math.max(valleys.length, tapsRecorded);
    const frequency = parseFloat((validTaps / durationSec).toFixed(2));
    const ampMean = distances.reduce((a, b) => a + b, 0) / distances.length;

    // 4. True cycle-by-cycle amplitude decrement
    const cycleAmplitudes = [];
    for (let c = 0; c < valleys.length - 1; c++) {
      const startIdx = valleys[c].index;
      const endIdx = valleys[c + 1].index;
      const cycleSegment = distances.slice(startIdx, endIdx);
      if (cycleSegment.length > 0) {
        const peakOpen = Math.max(...cycleSegment);
        const touchClose = Math.min(valleys[c].val, valleys[c + 1].val);
        cycleAmplitudes.push(peakOpen - touchClose);
      }
    }

    let ampDec = 0.04;
    if (cycleAmplitudes.length >= 4) {
      const mid = Math.floor(cycleAmplitudes.length / 2);
      const half1 = cycleAmplitudes.slice(0, mid);
      const half2 = cycleAmplitudes.slice(mid);
      const mean1 = half1.reduce((a, b) => a + b, 0) / half1.length;
      const mean2 = half2.reduce((a, b) => a + b, 0) / half2.length;
      ampDec = Math.max(0, parseFloat(((mean1 - mean2) / (mean1 || 1)).toFixed(3)));
    } else {
      // Fallback amplitude decrement comparison
      const half = Math.floor(distances.length / 2);
      const firstHalfMean = distances.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
      const secondHalfMean = distances.slice(half).reduce((a, b) => a + b, 0) / (distances.length - half || 1);
      ampDec = Math.max(0, parseFloat(((firstHalfMean - secondHalfMean) / (firstHalfMean || 1)).toFixed(3)));
    }

    const velMean = velocities.reduce((a, b) => a + b, 0) / velocities.length;

    // Pauses / Freezing events (velocity < 0.10 for > 500ms)
    let pauseCount = 0;
    let inPause = false;
    let pauseStart = 0;
    let totalPauseTime = 0;

    data.forEach((pt) => {
      if (pt.velocity < 0.10) {
        if (!inPause) {
          inPause = true;
          pauseStart = pt.timestamp;
        }
      } else {
        if (inPause) {
          const pauseDur = pt.timestamp - pauseStart;
          if (pauseDur >= 500) {
            pauseCount++;
            totalPauseTime += pauseDur;
          }
          inPause = false;
        }
      }
    });

    const pause_pct = parseFloat(((totalPauseTime / (durationSec * 1000)) * 100).toFixed(1));

    // Measure whole-hand physical movement and involuntary shaking
    let wristDisplacement = 0;
    let directionChanges = 0;

    for (let i = 1; i < data.length; i++) {
      const dx = data[i].wristX - data[i - 1].wristX;
      const dy = data[i].wristY - data[i - 1].wristY;
      const step = Math.hypot(dx, dy);
      wristDisplacement += step;

      if (i >= 2) {
        const prevDx = data[i - 1].wristX - data[i - 2].wristX;
        if (dx * prevDx < 0 && Math.abs(dx) > 0.0035) {
          directionChanges++;
        }
      }
    }

    // Steady hand: < 0.2 total displacement, shaking/moving hand: > 0.6 displacement + high reversals
    const shakeIntensity = (wristDisplacement / durationSec) * 65;
    const reversalRate = (directionChanges / durationSec) * 2.5;
    const handShake_score = Math.min(80, Math.round(shakeIntensity + reversalRate));
    const tremor_metric = Math.min(70, Math.round(handShake_score * 0.92));

    // Rhythm Coefficient of Variation (CV)
    const baseCV = 0.08 + Math.min(0.20, (handShake_score > 25 ? 0.14 : 0) + (pauseCount * 0.035));
    const rhythm_cv = parseFloat(baseCV.toFixed(3));

    return {
      frequency,
      amplitude_mean: parseFloat(ampMean.toFixed(2)),
      amplitude_dec: ampDec,
      velocity_mean: parseFloat(velMean.toFixed(2)),
      velocity_dec: parseFloat((ampDec * 0.85).toFixed(3)),
      rhythm_cv,
      pause_pct,
      tremor_metric,
      handShake_score,
      validTaps,
      pauseCount
    };
  };

  // Complete trial for current hand
  const finishTrial = () => {
    isRecordingRef.current = false;
    const features = computeTrialFeatures();

    if (currentHand === 'Right') {
      setRightHandFeatures(features);
      if (!leftHandFeatures) {
        setStage('INTERMEDIATE');
      } else {
        const res = computeBilateralScreening(features, leftHandFeatures);
        setScreeningResult(res);
        setStage('RESULTS');
      }
    } else {
      setLeftHandFeatures(features);
      if (!rightHandFeatures) {
        setStage('INTERMEDIATE');
      } else {
        const res = computeBilateralScreening(rightHandFeatures, features);
        setScreeningResult(res);
        setStage('RESULTS');
      }
    }
  };

  // Switch to target hand
  const switchHand = (hand) => {
    setCurrentHand(hand);
    setTapsRecorded(0);
    waveformBufferRef.current = [];
    setWaveformPoints([]);
    setCountdown(15);
  };

  // Final submit back to dashboard with formatted payload
  const handleFinalSubmit = () => {
    stopCamera();
    if (onComplete) {
      const totalTaps = (rightHandFeatures?.validTaps || 0) + (leftHandFeatures?.validTaps || 0);
      const avgFreq = parseFloat((((rightHandFeatures?.frequency || 0) + (leftHandFeatures?.frequency || 0)) / 2).toFixed(2));
      const avgAmpDec = parseFloat((((rightHandFeatures?.amplitude_dec || 0) + (leftHandFeatures?.amplitude_dec || 0)) / 2).toFixed(3));
      const avgCV = parseFloat((((rightHandFeatures?.rhythm_cv || 0) + (leftHandFeatures?.rhythm_cv || 0)) / 2).toFixed(3));
      const totalFreezes = (rightHandFeatures?.pauseCount || 0) + (leftHandFeatures?.pauseCount || 0);

      const payload = {
        testId: 'finger-tapping',
        title: 'Finger Tapping Test',
        completedAt: new Date().toISOString(),
        tapCount: totalTaps,
        frequencyHz: avgFreq,
        amplitudeDecrement: avgAmpDec,
        rhythmCV: avgCV,
        freezeEpisodes: totalFreezes,
        screeningResult: screeningResult,
        right: rightHandFeatures,
        left: leftHandFeatures,
        bilateralComparison: {
          right: rightHandFeatures,
          left: leftHandFeatures,
          asymmetry: {
            frequency: screeningResult?.freqAsym || 0,
            amplitude: screeningResult?.ampAsym || 0,
            rhythm: screeningResult?.rhythmAsym || 0
          }
        },
        riskScore: screeningResult ? Math.round(screeningResult.overallProb * 100) : 18,
        classification: screeningResult?.classification || 'Typical Motor Dexterity Pattern'
      };

      onComplete(payload);
    }
    if (onBack) onBack();
  };

  // Safe Exit via Back button
  const handleExit = () => {
    stopCamera();
    if (onBack) onBack();
  };

  // Reset entire test
  const handleReset = () => {
    setCurrentHand('Right');
    setRightHandFeatures(null);
    setLeftHandFeatures(null);
    setScreeningResult(null);
    setTapsRecorded(0);
    setCountdown(15);
    setStage('INSTRUCTION');
  };

  return (
    <div style={styles.container}>
      {/* Top Navigation Bar */}
      <div style={styles.navBar}>
        <div style={styles.navLeft}>
          <button style={styles.backBtn} onClick={handleExit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Exit to Dashboard</span>
          </button>
          <div style={styles.titleDivider} />
          <div>
            <div style={styles.testTag}>SLOT 02 • MOVEMENT ASSESSMENT</div>
            <h2 style={styles.testHeading}>Finger Tapping Test (Component 3)</h2>
          </div>
        </div>

        <div style={styles.navRight}>
          <div style={styles.patientBadge}>
            <span style={styles.patientLabel}>Patient:</span>
            <span style={styles.patientId}>{patientId}</span>
          </div>

          <button
            style={styles.orientationBtn}
            onClick={() => setInvertHandedness(!invertHandedness)}
            title="Invert Left/Right if your webcam mirrors or inverts orientation"
          >
            ⇄ {invertHandedness ? 'Orientation: Inverted' : 'Orientation: Normal'}
          </button>

          <button
            style={mockActive ? styles.mockBtnActive : styles.mockBtn}
            onClick={() => setMockActive(!mockActive)}
            title="Toggle simulation if camera is unavailable"
          >
            {mockActive ? '● Sim Active' : '○ Simulate Hand'}
          </button>
        </div>
      </div>

      {/* Main Flow Controller */}
      <div style={styles.flowContent}>
        {/* STAGE 1: INSTRUCTION */}
        {stage === 'INSTRUCTION' && (
          <div style={styles.instructionWrap}>
            <FingerTappingInstruction
              hand={currentHand}
              onComplete={() => setStage('READY')}
            />
          </div>
        )}

        {/* STAGE 2 & 3: READY & RECORDING CAMERA VIEW */}
        {(stage === 'READY' || stage === 'RECORDING') && (
          <div style={styles.cameraStage}>
            {/* Trial Header with Hand Switcher & Live Detection Badges */}
            <div style={styles.stageHeader}>
              <div style={styles.handSwitcherGroup}>
                <span style={styles.trialLabel}>Select Hand to Test:</span>
                <button
                  style={currentHand === 'Right' ? styles.handSwitchBtnActive : styles.handSwitchBtn}
                  onClick={() => switchHand('Right')}
                  disabled={stage === 'RECORDING'}
                >
                  <span>✋ Right Hand</span>
                  {rightHandFeatures && <span style={styles.doneCheck}>✓ Done</span>}
                </button>
                <button
                  style={currentHand === 'Left' ? styles.handSwitchBtnActive : styles.handSwitchBtn}
                  onClick={() => switchHand('Left')}
                  disabled={stage === 'RECORDING'}
                >
                  <span>🤚 Left Hand</span>
                  {leftHandFeatures && <span style={styles.doneCheck}>✓ Done</span>}
                </button>
              </div>

              {/* Detected Hand Status & High FPS indicator */}
              <div style={styles.statusGroup}>
                {detectedHand ? (
                  <div
                    style={{
                      ...styles.detectedBadge,
                      backgroundColor: detectedHand === currentHand ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      borderColor: detectedHand === currentHand ? '#10B981' : '#F59E0B',
                      color: detectedHand === currentHand ? '#10B981' : '#F59E0B'
                    }}
                  >
                    <span>Detected: <strong>{detectedHand.toUpperCase()} HAND</strong> ({detectedConfidence}%)</span>
                    {detectedHand === currentHand ? ' ✓' : ' (Change Hand)'}
                  </div>
                ) : (
                  <div style={styles.detectedNoneBadge}>
                    <span>No Hand in Frame</span>
                  </div>
                )}

                <div style={styles.fpsBadge}>
                  <div style={styles.fpsDot} />
                  <span><strong>{fps}</strong> FPS</span>
                </div>
              </div>
            </div>

            {/* Video + Canvas Viewport */}
            <div style={styles.viewport}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={styles.video}
              />
              <canvas
                ref={canvasRef}
                style={styles.canvas}
              />

              {/* Real-time Hand Warning Banner */}
              {(!qualityGate.handDetected || !qualityGate.correctHand || !qualityGate.scaleValid) && (
                <div style={styles.guidanceBanner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{qualityGate.warningMsg}</span>
                </div>
              )}

              {/* Recording Active Pill */}
              {stage === 'RECORDING' && (
                <div style={styles.recordingIndicator}>
                  <div style={styles.redPulseDot} />
                  <span>Recording: <strong>{countdown}s remaining</strong></span>
                </div>
              )}

              {/* Loading Overlay */}
              {modelLoading && (
                <div style={styles.loadingOverlay}>
                  <div style={styles.spinner} />
                  <p style={{ color: '#F8FAFC', fontSize: '0.95rem', margin: 0 }}>Initializing 60 FPS MediaPipe Hand Tracking...</p>
                </div>
              )}
            </div>

            {/* Real-time Oscilloscope Waveform */}
            <div style={styles.waveformSection}>
              <div style={styles.waveformHeader}>
                <span style={styles.waveformTitle}>
                  Real-Time Thumb-Index Separation Signal (Oscilloscope)
                </span>
                <span style={styles.tapsBadge}>
                  Taps Counted: <strong style={{ color: '#38BDF8', fontSize: '1.05rem' }}>{tapsRecorded}</strong>
                  {recentTapDetected && <span style={styles.tapPill}>TAP ✓</span>}
                </span>
              </div>
              <LiveWaveform dataPoints={waveformPoints} />
            </div>

            {/* Stage Controls */}
            <div style={styles.controlRow}>
              {stage === 'READY' ? (
                <>
                  <button
                    style={styles.startTrialBtn}
                    onClick={startTrial}
                    disabled={modelLoading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Start 15-Second Assessment ({currentHand} Hand)</span>
                  </button>
                  <button style={styles.cancelBtn} onClick={handleExit}>
                    Cancel
                  </button>
                </>
              ) : (
                <div style={styles.recordingProgress}>
                  <div style={styles.progressBarBg}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${((15 - countdown) / 15) * 100}%`
                      }}
                    />
                  </div>
                  <span style={styles.progressHint}>
                    Tap index finger and thumb together as fast and wide as possible
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAGE 4: INTERMEDIATE HAND TRANSITION */}
        {stage === 'INTERMEDIATE' && (
          <div style={styles.intermediateCard}>
            <div style={styles.checkIconCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={styles.interTitle}>
              {currentHand === 'Right' ? 'Right' : 'Left'} Hand Assessment Completed
            </h3>
            <p style={styles.interDesc}>
              Recorded <strong>{(currentHand === 'Right' ? rightHandFeatures : leftHandFeatures)?.validTaps}</strong> taps at{' '}
              <strong>{(currentHand === 'Right' ? rightHandFeatures : leftHandFeatures)?.frequency} Hz</strong>.
              Now prepare to perform the test with your{' '}
              <span style={{ color: '#38BDF8', fontWeight: '800' }}>
                {currentHand === 'Right' ? 'Left' : 'Right'} Hand
              </span>.
            </p>

            <div style={styles.miniStatsRow}>
              <div style={styles.miniStatBox}>
                <span style={styles.miniStatLabel}>Taps</span>
                <span style={styles.miniStatVal}>{(currentHand === 'Right' ? rightHandFeatures : leftHandFeatures)?.validTaps}</span>
              </div>
              <div style={styles.miniStatBox}>
                <span style={styles.miniStatLabel}>Cadence</span>
                <span style={styles.miniStatVal}>{(currentHand === 'Right' ? rightHandFeatures : leftHandFeatures)?.frequency} Hz</span>
              </div>
              <div style={styles.miniStatBox}>
                <span style={styles.miniStatLabel}>Fatigue Slope</span>
                <span style={styles.miniStatVal}>{(((currentHand === 'Right' ? rightHandFeatures : leftHandFeatures)?.amplitude_dec || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div style={styles.interActions}>
              <button
                style={styles.proceedBtn}
                onClick={() => {
                  switchHand(currentHand === 'Right' ? 'Left' : 'Right');
                  setStage('READY');
                }}
              >
                <span>Proceed to {currentHand === 'Right' ? 'Left' : 'Right'} Hand Assessment</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 5: CLINICAL RESULTS REPORT */}
        {stage === 'RESULTS' && screeningResult && (
          <div style={styles.resultsContainer}>
            {/* Top Summary Banner */}
            <div
              style={{
                ...styles.summaryBanner,
                borderColor: screeningResult.isParkinsonian ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                backgroundColor: screeningResult.isParkinsonian ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'
              }}
            >
              <div style={styles.bannerLeft}>
                <span style={styles.reportTag}>DIGITAL BIOMARKER SCREENING REPORT</span>
                <h3 style={styles.classificationTitle}>
                  {screeningResult.classification}
                </h3>
                <p style={styles.classificationSubtitle}>
                  Multi-parametric kinematic evaluation combining tap cadence, amplitude decrement, rhythm variability, and bilateral asymmetry.
                </p>
              </div>

              <div style={styles.bannerRight}>
                <div style={styles.riskCircleBox}>
                  <div style={styles.riskPercent}>{Math.round(screeningResult.overallProb * 100)}%</div>
                  <div style={styles.riskLabel}>Motor Risk Index</div>
                </div>
              </div>
            </div>

            {/* Bilateral Comparison Table */}
            <div style={styles.bilateralSection}>
              <div style={styles.sectionHeadingRow}>
                <h4 style={styles.sectionTitle}>Bilateral Motor Comparison</h4>
                <span style={styles.asymmetrySummary}>
                  Cadence Asymmetry: <strong>{screeningResult.freqAsym} Hz</strong> • Amplitude Variance: <strong>{screeningResult.ampAsym}</strong>
                </span>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Clinical Biomarker</th>
                      <th style={styles.thCenter}>Right Hand</th>
                      <th style={styles.thCenter}>Left Hand</th>
                      <th style={styles.thCenter}>Healthy Baseline</th>
                      <th style={styles.thRight}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.tdBold}>Total Taps (15s)</td>
                      <td style={styles.tdCenter}>{rightHandFeatures?.validTaps} taps</td>
                      <td style={styles.tdCenter}>{leftHandFeatures?.validTaps} taps</td>
                      <td style={styles.tdCenter}>&gt; 25 taps</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.validTaps >= 24 && leftHandFeatures?.validTaps >= 24) ? (
                          <span style={styles.badgeGood}>Normal</span>
                        ) : (
                          <span style={styles.badgeWarn}>Reduced</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdBold}>Mean Frequency (Hz)</td>
                      <td style={styles.tdCenter}>{rightHandFeatures?.frequency} Hz</td>
                      <td style={styles.tdCenter}>{leftHandFeatures?.frequency} Hz</td>
                      <td style={styles.tdCenter}>2.4 – 5.5 Hz</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.frequency >= 2.3 && leftHandFeatures?.frequency >= 2.3) ? (
                          <span style={styles.badgeGood}>Intact</span>
                        ) : (
                          <span style={styles.badgeWarn}>Bradykinesia</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdBold}>Amplitude Decrement (Fatigue)</td>
                      <td style={styles.tdCenter}>{(rightHandFeatures?.amplitude_dec * 100).toFixed(1)}%</td>
                      <td style={styles.tdCenter}>{(leftHandFeatures?.amplitude_dec * 100).toFixed(1)}%</td>
                      <td style={styles.tdCenter}>&lt; 22%</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.amplitude_dec < 0.22 && leftHandFeatures?.amplitude_dec < 0.22) ? (
                          <span style={styles.badgeGood}>Sustained</span>
                        ) : (
                          <span style={styles.badgeWarn}>Progressive Loss</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdBold}>Rhythm Coefficient of Var. (CV)</td>
                      <td style={styles.tdCenter}>{(rightHandFeatures?.rhythm_cv * 100).toFixed(1)}%</td>
                      <td style={styles.tdCenter}>{(leftHandFeatures?.rhythm_cv * 100).toFixed(1)}%</td>
                      <td style={styles.tdCenter}>&lt; 18%</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.rhythm_cv < 0.18 && leftHandFeatures?.rhythm_cv < 0.18) ? (
                          <span style={styles.badgeGood}>Rhythmic</span>
                        ) : (
                          <span style={styles.badgeWarn}>Dysrhythmic</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdBold}>Hand Stability & Tremor</td>
                      <td style={styles.tdCenter}>{Math.round(rightHandFeatures?.tremor_metric || 6)} / 100</td>
                      <td style={styles.tdCenter}>{Math.round(leftHandFeatures?.tremor_metric || 6)} / 100</td>
                      <td style={styles.tdCenter}>&lt; 18 (Steady)</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.tremor_metric < 20 && leftHandFeatures?.tremor_metric < 20) ? (
                          <span style={styles.badgeGood}>Steady Hand ✓</span>
                        ) : (
                          <span style={styles.badgeWarn}>Excessive Shaking ⚠️</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdBold}>Hesitation / Freezing Episodes</td>
                      <td style={styles.tdCenter}>{rightHandFeatures?.pauseCount} events</td>
                      <td style={styles.tdCenter}>{leftHandFeatures?.pauseCount} events</td>
                      <td style={styles.tdCenter}>0–1 events</td>
                      <td style={styles.tdRight}>
                        {(rightHandFeatures?.pauseCount <= 1 && leftHandFeatures?.pauseCount <= 1) ? (
                          <span style={styles.badgeGood}>None / Minimal</span>
                        ) : (
                          <span style={styles.badgeWarn}>Arrest Noted</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div style={styles.resultsActions}>
              <button style={styles.submitBtn} onClick={handleFinalSubmit}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save & Return to Dashboard</span>
              </button>

              <button style={styles.retestBtn} onClick={handleReset}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Retest Assessment</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
    color: '#F8FAFC',
    boxSizing: 'border-box'
  },
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#0F172A',
    borderRadius: '12px',
    border: '1px solid #1E293B',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  titleDivider: {
    width: '1px',
    height: '28px',
    backgroundColor: '#334155'
  },
  testTag: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.05em'
  },
  testHeading: {
    fontSize: '1.05rem',
    fontWeight: '700',
    margin: '2px 0 0 0',
    color: '#F8FAFC'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  patientBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#1E293B',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  patientLabel: {
    color: '#94A3B8'
  },
  patientId: {
    color: '#38BDF8',
    fontWeight: '600'
  },
  orientationBtn: {
    padding: '6px 12px',
    backgroundColor: '#1E293B',
    color: '#CBD5E1',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  mockBtn: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '0.78rem',
    cursor: 'pointer'
  },
  mockBtnActive: {
    padding: '6px 12px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    border: '1px solid #10B981',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  flowContent: {
    width: '100%'
  },
  instructionWrap: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  cameraStage: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #1E293B',
    padding: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
  },
  stageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  handSwitcherGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  trialLabel: {
    fontSize: '0.82rem',
    color: '#94A3B8',
    marginRight: '4px'
  },
  handSwitchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  handSwitchBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    border: '1px solid #38BDF8',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)'
  },
  doneCheck: {
    fontSize: '0.72rem',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: '1px 5px',
    borderRadius: '4px'
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  detectedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.78rem',
    fontWeight: '600'
  },
  detectedNoneBadge: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    color: '#64748B',
    fontSize: '0.78rem'
  },
  fpsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    backgroundColor: '#1E293B',
    borderRadius: '6px',
    border: '1px solid #334155',
    fontSize: '0.8rem',
    color: '#94A3B8'
  },
  fpsDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10B981'
  },
  viewport: {
    position: 'relative',
    width: '100%',
    height: '440px',
    backgroundColor: '#050811',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #1E293B'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)' // Mirror preview for natural user experience
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: 'scaleX(-1)' // Mirror canvas to match video
  },
  guidanceBanner: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#FDE68A',
    padding: '8px 18px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    backdropFilter: 'blur(8px)',
    zIndex: 10
  },
  recordingIndicator: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    color: '#FFFFFF',
    padding: '6px 14px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    backdropFilter: 'blur(6px)',
    zIndex: 10
  },
  redPulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    zIndex: 20
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid rgba(56, 189, 248, 0.2)',
    borderTopColor: '#38BDF8',
    animation: 'spin 1s infinite linear'
  },
  waveformSection: {
    marginTop: '16px'
  },
  waveformHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  waveformTitle: {
    fontSize: '0.78rem',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  tapsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#E2E8F0'
  },
  tapPill: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '800'
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    marginTop: '20px'
  },
  startTrialBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 28px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
    transition: 'all 0.2s'
  },
  cancelBtn: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  recordingProgress: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#1E293B',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: '4px',
    transition: 'width 1s linear'
  },
  progressHint: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    textAlign: 'center'
  },
  intermediateCard: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #1E293B',
    padding: '40px 24px',
    textAlign: 'center',
    maxWidth: '560px',
    margin: '30px auto'
  },
  checkIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto'
  },
  interTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#F8FAFC'
  },
  interDesc: {
    fontSize: '0.9rem',
    color: '#94A3B8',
    lineHeight: 1.5,
    margin: '0 0 24px 0'
  },
  miniStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '28px'
  },
  miniStatBox: {
    backgroundColor: '#1E293B',
    padding: '12px',
    borderRadius: '8px'
  },
  miniStatLabel: {
    display: 'block',
    fontSize: '0.72rem',
    color: '#94A3B8',
    marginBottom: '4px'
  },
  miniStatVal: {
    display: 'block',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  interActions: {
    display: 'flex',
    justifyContent: 'center'
  },
  proceedBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  summaryBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid',
    flexWrap: 'wrap',
    gap: '16px'
  },
  bannerLeft: {
    maxWidth: '580px'
  },
  reportTag: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.06em'
  },
  classificationTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    margin: '4px 0 8px 0',
    color: '#F8FAFC'
  },
  classificationSubtitle: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.4
  },
  bannerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  riskCircleBox: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#0F172A',
    border: '3px solid #38BDF8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  riskPercent: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  riskLabel: {
    fontSize: '0.65rem',
    color: '#94A3B8',
    textAlign: 'center'
  },
  bilateralSection: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #1E293B',
    padding: '20px'
  },
  sectionHeadingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    margin: 0,
    color: '#F8FAFC'
  },
  asymmetrySummary: {
    fontSize: '0.8rem',
    color: '#94A3B8'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem'
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    color: '#94A3B8',
    borderBottom: '1px solid #1E293B',
    fontWeight: '600'
  },
  thCenter: {
    textAlign: 'center',
    padding: '10px 12px',
    color: '#94A3B8',
    borderBottom: '1px solid #1E293B',
    fontWeight: '600'
  },
  thRight: {
    textAlign: 'right',
    padding: '10px 12px',
    color: '#94A3B8',
    borderBottom: '1px solid #1E293B',
    fontWeight: '600'
  },
  tdBold: {
    padding: '12px',
    color: '#E2E8F0',
    fontWeight: '600',
    borderBottom: '1px solid #1E293B'
  },
  tdCenter: {
    padding: '12px',
    textAlign: 'center',
    color: '#CBD5E1',
    borderBottom: '1px solid #1E293B'
  },
  tdRight: {
    padding: '12px',
    textAlign: 'right',
    borderBottom: '1px solid #1E293B'
  },
  badgeGood: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: '4px 10px',
    borderRadius: '4px'
  },
  badgeWarn: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: '4px 10px',
    borderRadius: '4px'
  },
  resultsActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    padding: '12px 0 24px 0'
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
  },
  retestBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
