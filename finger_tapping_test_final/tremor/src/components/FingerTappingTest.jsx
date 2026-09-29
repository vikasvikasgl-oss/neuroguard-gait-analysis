import React, { useState, useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import LiveWaveform from './LiveWaveform.jsx';

// Skeletal connection pairs for drawing hand lines
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [9, 10], [10, 11], [11, 12],    // Middle
  [13, 14], [14, 15], [15, 16],   // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  // Palm connections
  [5, 9], [9, 13], [13, 17]
];

function drawHandSkeleton(ctx, landmarks, width, height) {
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
  ctx.lineWidth = 3.5;
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
}

export default function FingerTappingTest({ hand = "Right", landmarker, modelLoading, onComplete, onCancel }) {
  const [testState, setTestState] = useState('READY'); // READY, RECORDING, PROCESSING, ERROR
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(15); // Standard 15-second assessment
  const [fps, setFps] = useState(30);
  const [handInView, setHandInView] = useState(false);
  const [waveformPoints, setWaveformPoints] = useState([]);
  
  // Real-time quality gate feedback states
  const [qualityGate, setQualityGate] = useState({
    handDetected: false,
    correctHand: false,
    scaleValid: false,
    stable: false,
    warningMsg: "Awaiting hand placement..."
  });

  const [mockTracking, setMockTracking] = useState(false);

  // Keyboard shortcut to toggle mock tracking for testing/reviewing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'm') {
        setMockTracking((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [tapsRecorded, setTapsRecorded] = useState(0);
  const [recentTapDetected, setRecentTapDetected] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const frameRequestRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  
  // Storage for time series: { timestamp, distance, rawDistance, palmWidth, velocity }
  const rawDataRef = useRef([]);
  const prevPositionRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  // Dynamic range envelope for adaptive real-time tap counting
  const runningMinRef = useRef(0.12);
  const runningMaxRef = useRef(0.35);

  // Cleanup hook for animation frames
  useEffect(() => {
    return () => {
      if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
    };
  }, []);

  // Initialize Camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setErrorMessage('Camera access was not granted. Check permissions in browser.');
        setTestState('ERROR');
      }
    }
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Tracking, Quality Gate, and Data Collection Loop
  useEffect(() => {
    if (modelLoading || testState === 'ERROR') return;

    let frameCount = 0;
    let lastFpsTime = performance.now();
    let lastRawDistance = 0.2;

    const processFrame = () => {
      if (videoRef.current && landmarker && videoRef.current.readyState >= 2) {
        const now = performance.now();
        frameCount++;
        if (now - lastFpsTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
          frameCount = 0;
          lastFpsTime = now;
        }

        const results = landmarker.detectForVideo(videoRef.current, now);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx && canvas) {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Render alignment guide box in center
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.roundRect(canvas.width * 0.30, canvas.height * 0.15, canvas.width * 0.40, canvas.height * 0.70, 16);
          ctx.stroke();
          ctx.setLineDash([]);

          if (mockTracking) {
            setHandInView(true);
            setQualityGate({
              handDetected: true,
              correctHand: true,
              scaleValid: true,
              stable: true,
              warningMsg: "MOCK ACTIVE: Press 'm' to return to camera."
            });

            const time = now / 1000;
            // Simulated finger pinch oscillation (~2.8Hz)
            const pinchState = Math.pow(Math.abs(Math.sin(time * 2.8 * Math.PI)), 4);
            const distanceVal = 0.04 + pinchState * 0.18; // Normalized distance

            // Create simulated landmarks in normalized space
            const mockLandmarks = Array(21).fill(null).map((_, idx) => {
              if (idx === 0) return { x: 0.4, y: 0.8, z: 0 };
              if (idx === 1) return { x: 0.45, y: 0.75, z: 0 };
              if (idx === 2) return { x: 0.5, y: 0.7, z: 0 };
              if (idx === 3) return { x: 0.55, y: 0.65, z: 0 };
              if (idx === 4) return { x: 0.65, y: 0.52 + distanceVal * 0.4, z: 0 }; // Thumb tip
              
              if (idx === 5) return { x: 0.5, y: 0.5, z: 0 };
              if (idx === 6) return { x: 0.55, y: 0.45, z: 0 };
              if (idx === 7) return { x: 0.6, y: 0.4, z: 0 };
              if (idx === 8) return { x: 0.65, y: 0.48 - distanceVal * 0.4, z: 0 }; // Index tip
              
              if (idx === 9) return { x: 0.45, y: 0.52, z: 0 };
              if (idx === 13) return { x: 0.4, y: 0.55, z: 0 };
              if (idx === 17) return { x: 0.35, y: 0.6, z: 0 };
              
              return { x: 0.35 + (idx % 3) * 0.05, y: 0.6 + (idx / 4) * 0.02, z: 0 };
            });

            // Draw Hand skeletal connections
            drawHandSkeleton(ctx, mockLandmarks, canvas.width, canvas.height);

            // Draw active tips
            [4, 8].forEach((idx) => {
              const pt = mockLandmarks[idx];
              ctx.fillStyle = '#10B981';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 7, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });

            // Draw connection line
            const pt4 = mockLandmarks[4];
            const pt8 = mockLandmarks[8];
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pt4.x * canvas.width, pt4.y * canvas.height);
            ctx.lineTo(pt8.x * canvas.width, pt8.y * canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tap counting triggers
            const timeSinceLastTap = now - lastTapTimeRef.current;
            if (distanceVal < 0.08 && lastRawDistance >= 0.08 && timeSinceLastTap > 250) {
              setTapsRecorded((prev) => prev + 1);
              setRecentTapDetected(true);
              lastTapTimeRef.current = now;
              setTimeout(() => setRecentTapDetected(false), 200);
            }
            lastRawDistance = distanceVal;

            // Record data
            if (testState === 'RECORDING') {
              let instantVelocity = 0;
              const prevFrame = rawDataRef.current[rawDataRef.current.length - 1];
              if (prevFrame) {
                const dt = (now - prevFrame.timestamp) / 1000;
                if (dt > 0) {
                  instantVelocity = Math.abs(distanceVal - prevFrame.distance) / dt;
                }
              }

              rawDataRef.current.push({
                timestamp: now,
                distance: distanceVal,
                palmWidth: 80,
                velocity: instantVelocity
              });

              const plotVal = Math.min(1.0, Math.max(0.0, distanceVal / 0.25));
              setWaveformPoints((prev) => [...prev.slice(-120), plotVal]);
            } else {
              const plotVal = Math.min(1.0, Math.max(0.0, distanceVal / 0.25));
              setWaveformPoints((prev) => [...prev.slice(-120), plotVal]);
            }

          } else if (results.landmarks && results.landmarks.length > 0 && results.handedness && results.handedness.length > 0) {
            const handLandmarks = results.landmarks[0];
            
            // 1. Handedness check
            const handCategory = results.handedness[0][0];
            const detectedHand = handCategory.categoryName || handCategory.displayName || handCategory.label || '';
            const isCorrectHand = detectedHand.toLowerCase() === hand.toLowerCase();

            // 2. Scale Check: distance between Knuckle 5 (Index MCP) and Knuckle 17 (Pinky MCP)
            const pt5 = handLandmarks[5];
            const pt17 = handLandmarks[17];
            const palmWidth = Math.hypot(pt5.x - pt17.x, pt5.y - pt17.y) * canvas.width;
            
            const isScaleValid = palmWidth >= 55 && palmWidth <= 180;
            const sizeFeedback = palmWidth < 55 ? "TOO_FAR" : palmWidth > 180 ? "TOO_CLOSE" : "VALID";

            // 3. Stability check (sudden coordinates jumps)
            const wrist = handLandmarks[0];
            let isStable = true;
            if (prevPositionRef.current) {
              const wristDiff = Math.hypot(wrist.x - prevPositionRef.current.x, wrist.y - prevPositionRef.current.y) * canvas.width;
              if (wristDiff > 45) { // excessive rapid drift / blur
                isStable = false;
              }
            }
            prevPositionRef.current = { x: wrist.x, y: wrist.y };

            // Determine aggregate quality gate pass state
            const passesAllGates = isCorrectHand && isScaleValid && isStable;
            
            let warningText = "";
            if (!isCorrectHand) {
              warningText = `Incorrect hand detected. Use your ${hand} hand (Detected: ${detectedHand}).`;
            } else if (sizeFeedback === "TOO_FAR") {
              warningText = "Hand too far. Position your hand closer inside the frame.";
            } else if (sizeFeedback === "TOO_CLOSE") {
              warningText = "Hand too close. Reposition further back.";
            } else if (!isStable) {
              warningText = "Excessive hand movement / motion blur. Hold wrist steady.";
            } else {
              warningText = "";
            }

            setHandInView(passesAllGates);
            setQualityGate({
              handDetected: true,
              correctHand: isCorrectHand,
              scaleValid: isScaleValid,
              stable: isStable,
              warningMsg: warningText
            });

            // Draw hand bones
            drawHandSkeleton(ctx, handLandmarks, canvas.width, canvas.height);

            // Draw active tips (Thumb 4, Index 8)
            const pt4 = handLandmarks[4];
            const pt8 = handLandmarks[8];

            [4, 8].forEach((idx) => {
              const pt = handLandmarks[idx];
              ctx.fillStyle = passesAllGates ? '#3B82F6' : '#EF4444';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 7, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });

            // Calculate EUCLIDEAN distance between finger tips
            const dx = pt8.x - pt4.x;
            const dy = pt8.y - pt4.y;
            const dz = pt8.z - pt4.z;
            const pixelDistance = Math.hypot(dx, dy, dz) * canvas.width;

            // ANATOMICAL NORMALIZATION: Divide tip distance by palm width
            const normalizedDistance = pixelDistance / palmWidth;

            // Draw distance tracking connector line
            ctx.strokeStyle = passesAllGates ? '#10B981' : '#F59E0B';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pt4.x * canvas.width, pt4.y * canvas.height);
            ctx.lineTo(pt8.x * canvas.width, pt8.y * canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw live pinch contact indicator if they are close
            if (normalizedDistance < 0.12 && passesAllGates) {
              ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
              ctx.beginPath();
              ctx.arc((pt4.x + pt8.x)/2 * canvas.width, (pt4.y + pt8.y)/2 * canvas.height, 16, 0, 2 * Math.PI);
              ctx.fill();
            }

            // Real-time tap detection with running adaptive envelope
            if (passesAllGates) {
              // Update running envelope
              if (normalizedDistance < runningMinRef.current) {
                runningMinRef.current = runningMinRef.current * 0.7 + normalizedDistance * 0.3;
              } else {
                runningMinRef.current = runningMinRef.current * 0.995 + normalizedDistance * 0.005;
              }
              
              if (normalizedDistance > runningMaxRef.current) {
                runningMaxRef.current = runningMaxRef.current * 0.7 + normalizedDistance * 0.3;
              } else {
                runningMaxRef.current = runningMaxRef.current * 0.995 + normalizedDistance * 0.005;
              }

              // Bind boundaries safely to prevent noise-driven thresholds
              const currentMin = Math.max(0.02, Math.min(0.20, runningMinRef.current));
              const currentMax = Math.max(0.15, Math.min(0.60, runningMaxRef.current));
              const currentRom = currentMax - currentMin;
              const adaptiveTouchThreshold = currentMin + 0.35 * currentRom;

              const timeSinceLastTap = now - lastTapTimeRef.current;
              if (normalizedDistance < adaptiveTouchThreshold && lastRawDistance >= adaptiveTouchThreshold && timeSinceLastTap > 240) {
                setTapsRecorded((prev) => prev + 1);
                setRecentTapDetected(true);
                lastTapTimeRef.current = now;
                setTimeout(() => setRecentTapDetected(false), 200);
              }
              lastRawDistance = normalizedDistance;
            }

            // Record data frame (only when scanning and quality gate passes)
            if (testState === 'RECORDING' && passesAllGates) {
              // Calculate instant velocity
              let instantVelocity = 0;
              const prevFrame = rawDataRef.current[rawDataRef.current.length - 1];
              if (prevFrame) {
                const dt = (now - prevFrame.timestamp) / 1000; // seconds
                if (dt > 0) {
                  instantVelocity = Math.abs(normalizedDistance - prevFrame.distance) / dt;
                }
              }

              rawDataRef.current.push({
                timestamp: now,
                distance: normalizedDistance,
                palmWidth: palmWidth,
                velocity: instantVelocity
              });

              // Scale normal distance (typically 0.05 to 1.3) to 0-1 for waveform rendering
              const plotVal = Math.min(1.0, Math.max(0.0, normalizedDistance / 1.1));
              setWaveformPoints((prev) => [...prev.slice(-120), plotVal]);
            } else if (testState === 'RECORDING' && !passesAllGates) {
              // Flatline waveform if quality gate drops during active scan
              setWaveformPoints((prev) => [...prev.slice(-120), 0]);
            } else {
              // Preview signal outside recording
              const plotVal = Math.min(1.0, Math.max(0.0, normalizedDistance / 1.1));
              setWaveformPoints((prev) => [...prev.slice(-120), plotVal]);
            }

          } else {
            // Hand not detected at all
            setHandInView(false);
            setQualityGate({
              handDetected: false,
              correctHand: false,
              scaleValid: false,
              stable: false,
              warningMsg: "Hand not detected. Position hand inside the guide box."
            });
            if (testState === 'RECORDING') {
              setWaveformPoints((prev) => [...prev.slice(-120), 0]);
            }
          }
        }
      }
      frameRequestRef.current = requestAnimationFrame(processFrame);
    };

    frameRequestRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
    };
  }, [modelLoading, testState, hand, landmarker]);

  // Handle Scanning Countdown - Timer ONLY decrements when quality checks pass!
  useEffect(() => {
    if (testState !== 'RECORDING') return;

    const timerInterval = setInterval(() => {
      // Only count down if hand is in view and passes all checks
      if (handInView) {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            processTappingData();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [testState, handInView]);

  const startAssessment = () => {
    rawDataRef.current = [];
    setWaveformPoints([]);
    setTapsRecorded(0);
    setCountdown(15);
    setTestState('RECORDING');
  };

  const handleResetTest = () => {
    setCountdown(15);
    setTapsRecorded(0);
    setWaveformPoints([]);
    rawDataRef.current = [];
    setErrorMessage('');
    setTestState('READY');
  };

  // Upgraded Feature Extraction & Temporal Signal Analysis
  const processTappingData = () => {
    setTestState('PROCESSING');
    
    const frames = rawDataRef.current;
    
    // Quality check: Ensure we collected enough valid frames (e.g. 15s at ~25-30fps requires ~350 frames. Let's allow minimum 180 frames)
    if (!frames || frames.length < 180) {
      setErrorMessage("Assessment Inconclusive — Please repeat the test. Maintain your hand clearly in front of the lens.");
      setTestState('ERROR');
      return;
    }

    setTimeout(() => {
      const distances = frames.map(f => f.distance);
      const times = frames.map(f => f.timestamp);
      const velocities = frames.map(f => f.velocity);

      // Smooth distance sequence (moving average, window=3)
      const smoothed = [];
      for (let i = 0; i < distances.length; i++) {
        let sum = 0, count = 0;
        for (let w = -1; w <= 1; w++) {
          if (distances[i+w] !== undefined) {
            sum += distances[i+w];
            count++;
          }
        }
        smoothed.push(sum / count);
      }

      // Find dynamic range of motion bounds using 10th and 90th percentiles to exclude tracking blips
      const sortedSmoothed = [...smoothed].sort((a, b) => a - b);
      const p10 = sortedSmoothed[Math.floor(sortedSmoothed.length * 0.10)] || 0.05;
      const p90 = sortedSmoothed[Math.floor(sortedSmoothed.length * 0.90)] || 0.35;
      const rom = p90 - p10; // Range of Motion

      // Adaptive touch and open thresholds
      const touchThreshold = p10 + 0.35 * rom; // 35% of range
      const openThreshold = p10 + 0.65 * rom;  // 65% of range

      // Hysteresis State Machine to find valleys (taps)
      const valleys = [];
      let trackingState = 'OPEN'; // 'OPEN' or 'CLOSED'
      let minInCycle = 999;
      let minInCycleIdx = -1;

      for (let i = 0; i < smoothed.length; i++) {
        const val = smoothed[i];
        if (trackingState === 'OPEN') {
          if (val < touchThreshold) {
            trackingState = 'CLOSED';
            minInCycle = val;
            minInCycleIdx = i;
          }
        } else if (trackingState === 'CLOSED') {
          if (val < minInCycle) {
            minInCycle = val;
            minInCycleIdx = i;
          }
          if (val > openThreshold) {
            if (minInCycleIdx !== -1) {
              valleys.push({ index: minInCycleIdx, time: times[minInCycleIdx], val: minInCycle });
            }
            trackingState = 'OPEN';
            minInCycle = 999;
            minInCycleIdx = -1;
          }
        }
      }
      // Push last incomplete cycle if it reached touch threshold
      if (trackingState === 'CLOSED' && minInCycleIdx !== -1) {
        valleys.push({ index: minInCycleIdx, time: times[minInCycleIdx], val: minInCycle });
      }

      const totalTaps = valleys.length;

      if (totalTaps < 4) {
        setErrorMessage("Assessment Inconclusive — Insufficient rhythmic taps detected. Ensure you open and close your fingers fully.");
        setTestState('ERROR');
        return;
      }

      // Calculate Inter-Tap Intervals (ITI)
      const intervals = [];
      for (let i = 1; i < valleys.length; i++) {
        intervals.push(valleys[i].time - valleys[i - 1].time);
      }

      // 1. TAPPING SPEED
      const durationSec = (times[times.length - 1] - times[0]) / 1000;
      const frequency = parseFloat((totalTaps / durationSec).toFixed(2));
      const meanITI = parseFloat((intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1));
      
      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      const medianITI = parseFloat(sortedIntervals[Math.floor(sortedIntervals.length / 2)].toFixed(1));

      // 2. MOVEMENT SPEED (Velocity & Acceleration)
      const peakVelocity = parseFloat(Math.max(...velocities).toFixed(3));
      const meanVelocity = parseFloat((velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(3));
      
      // Acceleration: dV/dT
      const accelerations = [];
      for (let i = 1; i < velocities.length; i++) {
        const dt = (times[i] - times[i - 1]) / 1000;
        if (dt > 0) {
          accelerations.push(Math.abs(velocities[i] - velocities[i - 1]) / dt);
        }
      }
      const peakAcceleration = parseFloat(Math.max(...accelerations).toFixed(3));

      // 3. AMPLITUDE
      const maxDistance = parseFloat(Math.max(...distances).toFixed(3));
      const minDistance = parseFloat(Math.min(...distances).toFixed(3));
      
      // Calculate cycle-by-cycle amplitudes (peak open distance between valleys)
      const amplitudes = [];
      for (let c = 0; c < valleys.length - 1; c++) {
        const startIdx = valleys[c].index;
        const endIdx = valleys[c+1].index;
        const cycleSegment = distances.slice(startIdx, endIdx);
        if (cycleSegment.length > 0) {
          const maxCycleDist = Math.max(...cycleSegment);
          const minCycleDist = Math.min(valleys[c].val, valleys[c+1].val);
          amplitudes.push(maxCycleDist - minCycleDist);
        }
      }

      const meanAmplitude = parseFloat((amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length).toFixed(3));
      const peakToPeakAmp = parseFloat((maxDistance - minDistance).toFixed(3));
      
      // Amplitude variability standard deviation
      const ampMean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
      const ampVar = amplitudes.reduce((a, b) => a + Math.pow(b - ampMean, 2), 0) / amplitudes.length;
      const amplitudeVariability = parseFloat(Math.sqrt(ampVar).toFixed(3));

      // 4. BRADYKINESIA / PROGRESSIVE DECREMENT (First Half vs Second Half)
      const midValleysIdx = Math.floor(valleys.length / 2);
      const firstHalfAmps = amplitudes.slice(0, midValleysIdx);
      const secondHalfAmps = amplitudes.slice(midValleysIdx);
      
      const meanAmp1 = firstHalfAmps.reduce((a, b) => a + b, 0) / firstHalfAmps.length;
      const meanAmp2 = secondHalfAmps.reduce((a, b) => a + b, 0) / (secondHalfAmps.length || 1);
      const amplitudeDecrement = parseFloat((meanAmp2 / (meanAmp1 || 1)).toFixed(3));

      // Velocity decrement
      const midFrameIdx = Math.floor(velocities.length / 2);
      const vel1 = velocities.slice(0, midFrameIdx);
      const vel2 = velocities.slice(midFrameIdx);
      const meanVel1 = vel1.reduce((a, b) => a + b, 0) / vel1.length;
      const meanVel2 = vel2.reduce((a, b) => a + b, 0) / vel2.length;
      const velocityDecrement = parseFloat((meanVel2 / (meanVel1 || 1)).toFixed(3));

      // Frequency decrement
      const dur1 = (times[valleys[midValleysIdx].index] - times[0]) / 1000;
      const dur2 = (times[times.length - 1] - times[valleys[midValleysIdx].index]) / 1000;
      const freq1 = midValleysIdx / dur1;
      const freq2 = (totalTaps - midValleysIdx) / dur2;
      const frequencyDecrement = parseFloat((freq2 / (freq1 || 1)).toFixed(3));

      const rangeReduction = parseFloat((meanAmp1 - meanAmp2).toFixed(3));
      
      const firstHalfITIs = intervals.slice(0, midValleysIdx);
      const secondHalfITIs = intervals.slice(midValleysIdx);
      const meanITI1 = firstHalfITIs.reduce((a, b) => a + b, 0) / firstHalfITIs.length;
      const meanITI2 = secondHalfITIs.reduce((a, b) => a + b, 0) / (secondHalfITIs.length || 1);
      const changeITI = parseFloat((meanITI2 - meanITI1).toFixed(1));

      // 5. RHYTHM
      const avgITI = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const varITI = intervals.reduce((a, b) => a + Math.pow(b - avgITI, 2), 0) / intervals.length;
      const stdDevITI = parseFloat(Math.sqrt(varITI).toFixed(1));
      const rhythm_cv = parseFloat((stdDevITI / avgITI).toFixed(4));
      
      // Consecutive tap-to-tap timing difference
      let diffSum = 0;
      for (let i = 1; i < intervals.length; i++) {
        diffSum += Math.abs(intervals[i] - intervals[i-1]);
      }
      const timingConsistency = parseFloat((diffSum / (intervals.length - 1)).toFixed(1));

      // 6. PAUSES (velocity below 0.05 for > 500ms)
      let pauseCount = 0;
      let totalPauseTime = 0;
      let maxPauseDuration = 0;
      let currentPauseStart = null;

      for (let i = 0; i < velocities.length; i++) {
        if (velocities[i] < 0.05) {
          if (currentPauseStart === null) {
            currentPauseStart = times[i];
          }
        } else {
          if (currentPauseStart !== null) {
            const pauseDuration = times[i] - currentPauseStart;
            if (pauseDuration >= 500) {
              pauseCount++;
              totalPauseTime += pauseDuration;
              if (pauseDuration > maxPauseDuration) {
                maxPauseDuration = pauseDuration;
              }
            }
            currentPauseStart = null;
          }
        }
      }
      // Check if paused at the end
      if (currentPauseStart !== null) {
        const pauseDuration = times[times.length - 1] - currentPauseStart;
        if (pauseDuration >= 500) {
          pauseCount++;
          totalPauseTime += pauseDuration;
          if (pauseDuration > maxPauseDuration) {
            maxPauseDuration = pauseDuration;
          }
        }
      }

      const avgPauseDuration = pauseCount > 0 ? parseFloat((totalPauseTime / pauseCount).toFixed(0)) : 0;
      const pausePercentage = parseFloat(((totalPauseTime / (durationSec * 1000)) * 100).toFixed(1));

      // 7. TREMOR-LIKE MOVEMENT (direction changes with small amplitude in 3.5 - 7.5 Hz range)
      let tremorOscillations = 0;
      let tremorAmpSum = 0;
      let tremorDur = 0;

      for (let i = 2; i < smoothed.length - 2; i++) {
        // Look for direction changes in open phases
        if (smoothed[i] > 0.15) {
          const diff = smoothed[i] - smoothed[i - 1];
          const prevDiff = smoothed[i - 1] - smoothed[i - 2];
          
          if (diff * prevDiff < 0) { // Direction change
            const amp = Math.abs(diff);
            if (amp > 0.002 && amp < 0.018) {
              tremorOscillations++;
              tremorAmpSum += amp;
              tremorDur += (times[i] - times[i-1]);
            }
          }
        }
      }

      const tremorFrequency = tremorDur > 0 ? parseFloat(((tremorOscillations / (tremorDur / 1000))).toFixed(1)) : 0;
      const tremorAmplitude = tremorOscillations > 0 ? parseFloat((tremorAmpSum / tremorOscillations).toFixed(4)) : 0;
      
      // Standard deviation of raw points relative to smoothed representing jitter
      let jitterSum = 0;
      for (let i = 0; i < smoothed.length; i++) {
        jitterSum += Math.pow(distances[i] - smoothed[i], 2);
      }
      const trajectoryVariability = parseFloat(Math.sqrt(jitterSum / smoothed.length).toFixed(4));

      // 8. COORDINATION & SMOOTHNESS (Calculated from velocity transitions)
      let transitions = 0;
      for (let i = 1; i < accelerations.length; i++) {
        if (accelerations[i] * accelerations[i-1] < 0) {
          transitions++;
        }
      }
      const smoothness = parseFloat((100 - Math.min(80, (transitions / durationSec) * 4)).toFixed(1));
      const trajectoryConsistency = parseFloat((100 - Math.min(80, trajectoryVariability * 1200)).toFixed(1));

      // Package extracted features
      const handFeatures = {
        frequency,
        amplitude_mean: meanAmplitude,
        amplitude_dec: amplitudeDecrement,
        velocity_mean: meanVelocity,
        velocity_dec: velocityDecrement,
        rhythm_cv,
        pause_pct: pausePercentage,
        tremor_metric: parseFloat((tremorOscillations * 0.8).toFixed(1)),
        // Metadata features
        validTaps: totalTaps,
        meanITI,
        medianITI,
        peakVelocity,
        peakAcceleration,
        maxDistance,
        minDistance,
        peakToPeakAmp,
        amplitudeVariability,
        frequencyDecrement,
        rangeReduction,
        changeITI,
        stdDevITI,
        timingConsistency,
        pauseCount,
        maxPauseDuration,
        avgPauseDuration,
        tremorFrequency,
        tremorAmplitude,
        trajectoryVariability,
        smoothness,
        trajectoryConsistency
      };

      onComplete(handFeatures);
      stopCamera();
    }, 1500);
  };

  return (
    <div style={styles.container}>
      {/* Dynamic Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: cssAnimations }} />

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.headerInfo}>
            <span style={styles.handBadge}>
              {hand.toUpperCase()} HAND TRIAL
            </span>
            <span style={styles.cardTitle}>Live Camera Test</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaBadge}>{fps} fps</span>
            {qualityGate.handDetected ? (
              qualityGate.correctHand && qualityGate.scaleValid ? (
                <span style={styles.activeText}>TRACKING OK ✓</span>
              ) : (
                <span style={styles.warningText}>TRACKING QUALITY LOW</span>
              )
            ) : (
              <span style={styles.dangerText}>HAND NOT DETECTED</span>
            )}
          </div>
        </div>

        {/* Video Canvas Stage */}
        <div style={styles.stageContainer}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.videoElement} />
          <canvas ref={canvasRef} style={styles.canvasElement} />

          {/* Quality Warning Banners */}
          {(!qualityGate.handDetected || !qualityGate.correctHand || !qualityGate.scaleValid || !qualityGate.stable) && !modelLoading && (
            <div style={styles.warningOverlay}>
              <div style={styles.warningBox}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={styles.warningTextString}>
                  {qualityGate.warningMsg || "Hand not detected. Position your hand clearly inside the camera frame."}
                </span>
              </div>
            </div>
          )}

          {/* Model Loading Screen */}
          {modelLoading && (
            <div style={styles.processingOverlay}>
              <div style={styles.spinner} />
              <h4 style={styles.processingHeading}>Loading computer vision models...</h4>
              <p style={styles.processingDesc}>Preparing MediaPipe Hand Tracking resolver.</p>
            </div>
          )}

          {/* Scanning Beam Animation */}
          {testState === 'RECORDING' && handInView && (
            <div style={styles.scanBeam} />
          )}

          {/* Record Status Overlay */}
          {testState === 'RECORDING' && (
            <div style={styles.recordingPill}>
              <span style={{ ...styles.recordDot, backgroundColor: handInView ? '#EF4444' : '#6B7280' }} className={handInView ? "pulse-record" : ""} />
              <span>
                {handInView 
                  ? `Recording: ${countdown}s remaining` 
                  : "Recording Paused — Hand Out of View"
                }
              </span>
            </div>
          )}

          {/* Analysis Processing Screen */}
          {testState === 'PROCESSING' && (
            <div style={styles.processingOverlay}>
              <div style={styles.spinner} />
              <h4 style={styles.processingHeading}>Decomposing Tapping Signal...</h4>
              <p style={styles.processingDesc}>Calculating coefficient of rhythm, peak amplitude CV, and fatigue ratios.</p>
            </div>
          )}
        </div>

        {/* Live dynamic oscilloscope */}
        {testState !== 'PROCESSING' && (
          <div style={styles.waveformContainer}>
            <div style={styles.waveformLabelRow}>
              <span style={styles.waveformLabel}>
                {testState === 'RECORDING' ? 'Active Movement Amplitude Signal' : 'Real-time Alignment Waveform'}
              </span>
              <span style={styles.waveformRate}>
                Taps Counted: <strong>{tapsRecorded}</strong>
                {recentTapDetected && <span style={styles.tapCheck}> Tap detected ✓</span>}
              </span>
            </div>
            <LiveWaveform dataPoints={waveformPoints} />
          </div>
        )}

        {/* Action Controls */}
        <div style={styles.toolbar}>
          {testState === 'READY' && (
            <div style={{ ...styles.buttonRow, maxWidth: '520px' }}>
              <button 
                style={{
                  ...styles.primaryButton,
                  opacity: modelLoading ? 0.5 : 1,
                  cursor: modelLoading ? 'not-allowed' : 'pointer'
                }} 
                onClick={startAssessment}
                disabled={modelLoading}
              >
                Start 15-Second Scan
              </button>
              <button style={styles.cancelBtn} onClick={onCancel}>
                Cancel
              </button>
              <button 
                id="dev-simulate-btn"
                style={{
                  ...styles.cancelBtn,
                  borderColor: mockTracking ? '#10B981' : '#374151',
                  color: mockTracking ? '#34D399' : '#9CA3AF',
                  marginLeft: '8px'
                }} 
                onClick={() => setMockTracking(prev => !prev)}
              >
                {mockTracking ? "✓ Mock Active" : "Mock Hand (Dev)"}
              </button>
            </div>
          )}

          {testState === 'RECORDING' && (
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div 
                  style={{ 
                    ...styles.progressFill, 
                    width: `${((15 - countdown) / 15) * 100}%`,
                    backgroundColor: handInView ? '#3B82F6' : '#6B7280'
                  }} 
                />
              </div>
              <p style={styles.progressHint}>
                {handInView 
                  ? "Tap your index finger and thumb together repeatedly..." 
                  : "Scan paused. Reposition your hand inside the frame to resume."
                }
              </p>
            </div>
          )}

          {testState === 'ERROR' && (
            <div style={styles.errorBox}>
              <p style={styles.errorMsg}>{errorMessage}</p>
              <div style={styles.buttonRow}>
                <button style={styles.secondaryButton} onClick={handleResetTest}>
                  Try Again
                </button>
                <button style={styles.cancelBtn} onClick={onCancel}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const cssAnimations = `
  @keyframes scanline {
    0% { top: 0%; }
    50% { top: 100%; }
    100% { top: 0%; }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulseGlowRed {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  .pulse-record {
    animation: pulseGlowRed 1.2s infinite ease-in-out;
  }
`;

const styles = {
  container: {
    width: '100%',
    maxWidth: '820px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: '12px',
    border: '1px solid #1F2937',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #1F2937',
    backgroundColor: '#111827',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  handBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    backgroundColor: '#1E293B',
    color: '#60A5FA',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    padding: '4px 8px',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  },
  cardTitle: {
    fontSize: '0.92rem',
    fontWeight: '700',
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
  activeText: {
    fontSize: '0.72rem',
    color: '#10B981',
    fontWeight: '600',
    letterSpacing: '0.03em',
  },
  warningText: {
    fontSize: '0.72rem',
    color: '#F59E0B',
    fontWeight: '600',
    letterSpacing: '0.03em',
  },
  dangerText: {
    fontSize: '0.72rem',
    color: '#EF4444',
    fontWeight: '600',
    letterSpacing: '0.03em',
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
  warningOverlay: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    right: '16px',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  warningBox: {
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    border: '1.5px solid #F59E0B',
    borderRadius: '8px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    maxWidth: '90%',
  },
  warningTextString: {
    fontSize: '0.8rem',
    color: '#FBBF24',
    fontWeight: '500',
    lineHeight: 1.3,
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
    boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)',
    animation: 'scanline 3s ease-in-out infinite',
    pointerEvents: 'none',
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
    zIndex: 5,
  },
  recordDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: '24px',
    textAlign: 'center',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #1F2937',
    borderTopColor: '#3B82F6',
    animation: 'spin 1s infinite linear',
    marginBottom: '16px',
  },
  processingHeading: {
    margin: '0 0 6px 0',
    color: '#F9FAFB',
    fontSize: '1rem',
    fontWeight: '600',
  },
  processingDesc: {
    margin: 0,
    color: '#9CA3AF',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  waveformContainer: {
    padding: '14px 20px 0 20px',
  },
  waveformLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    alignItems: 'center',
  },
  waveformLabel: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
  waveformRate: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
  tapCheck: {
    color: '#10B981',
    fontWeight: '700',
    marginLeft: '6px',
  },
  toolbar: {
    padding: '16px 20px',
    borderTop: '1px solid #1F2937',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    maxWidth: '380px',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 24px',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 2,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    border: '1px solid #374151',
    padding: '10px 20px',
    fontSize: '0.88rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    color: '#E5E7EB',
    border: '1px solid #374151',
    padding: '10px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
  },
  progressContainer: {
    width: '100%',
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
    transition: 'width 0.1s linear',
  },
  progressHint: {
    margin: '8px 0 0 0',
    fontSize: '0.8rem',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  errorMsg: {
    fontSize: '0.85rem',
    color: '#FCA5A5',
    margin: 0,
    lineHeight: 1.5,
    maxWidth: '360px',
  },
};
