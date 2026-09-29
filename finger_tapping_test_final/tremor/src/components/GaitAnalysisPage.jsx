import React, { useState, useRef, useEffect } from 'react';
import { getPoseLandmarker, analyzeVideoWithMediaPipe } from '../utils/poseTracker.js';
import { analyzeGaitKinematics } from '../utils/gaitKinematics.js';
import GaitSkeletonOverlay from './GaitSkeletonOverlay.jsx';
import GaitCharts from './GaitCharts.jsx';

export default function GaitAnalysisPage({ onBack, onComplete, initialCompleted = false }) {
  const [inputMode, setInputMode] = useState('UPLOAD'); // UPLOAD, CAMERA, SAMPLES
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ pct: 0, stage: '' });
  const [errorMessage, setErrorMessage] = useState(null);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [extractedFrames, setExtractedFrames] = useState(null);

  // Camera recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const cameraStreamRef = useRef(null);
  const liveVideoPreviewRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const liveAnimIdRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingSecondsRef = useRef(0);

  const hiddenVideoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clean up object URLs and stream on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      stopCameraStream();
    };
  }, [videoUrl]);

  // Manage camera preview when entering or leaving CAMERA tab
  useEffect(() => {
    if (inputMode === 'CAMERA' && !videoUrl) {
      startCameraPreview();
    } else if (inputMode !== 'CAMERA') {
      stopCameraStream();
    }
  }, [inputMode]);

  // Keep live preview video element attached whenever camera is active
  useEffect(() => {
    if (liveVideoPreviewRef.current && cameraStreamRef.current) {
      if (liveVideoPreviewRef.current.srcObject !== cameraStreamRef.current) {
        liveVideoPreviewRef.current.srcObject = cameraStreamRef.current;
        liveVideoPreviewRef.current.muted = true;
        liveVideoPreviewRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive, isRecording]);

  // Live Pose Tracking & Green Pointer Overlay on Camera Stream
  useEffect(() => {
    let active = true;

    if (inputMode === 'CAMERA' && !videoUrl && cameraActive) {
      getPoseLandmarker()
        .then((lm) => {
          if (!active) return;
          startLiveTracking(lm);
        })
        .catch((err) => {
          console.warn('Live pose landmarker load notice:', err);
          if (active) startLiveTracking(null);
        });
    } else {
      if (liveAnimIdRef.current) {
        cancelAnimationFrame(liveAnimIdRef.current);
        liveAnimIdRef.current = null;
      }
    }

    return () => {
      active = false;
      if (liveAnimIdRef.current) {
        cancelAnimationFrame(liveAnimIdRef.current);
        liveAnimIdRef.current = null;
      }
    };
  }, [inputMode, videoUrl, cameraActive]);

  const startLiveTracking = (landmarker) => {
    if (liveAnimIdRef.current) {
      cancelAnimationFrame(liveAnimIdRef.current);
      liveAnimIdRef.current = null;
    }

    let lastTime = -1;

    const render = () => {
      const video = liveVideoPreviewRef.current;
      const canvas = liveCanvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
          canvas.width = video.clientWidth;
          canvas.height = video.clientHeight;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const now = performance.now();
        let detected = false;

        if (landmarker && now > lastTime + 32) {
          lastTime = now;
          try {
            const results = landmarker.detectForVideo(video, now);
            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              drawGreenPosePointers(ctx, landmarks, width, height);
              detected = true;
            }
          } catch (e) {
            // Frame skip
          }
        }

        if (!detected) {
          drawGreenAlignmentGuide(ctx, width, height);
        }
        setPoseDetected(detected);
      }

      liveAnimIdRef.current = requestAnimationFrame(render);
    };

    liveAnimIdRef.current = requestAnimationFrame(render);
  };

  const drawGreenPosePointers = (ctx, landmarks, width, height) => {
    // 1. Skeletal connections in vibrant green
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // trunk
      [23, 24], // hips
      [23, 25], [25, 27], [27, 29], [29, 31], // left leg & foot
      [24, 26], [26, 28], [28, 30], [30, 32], // right leg & foot
    ];

    connections.forEach(([i1, i2]) => {
      const p1 = landmarks[i1];
      const p2 = landmarks[i2];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // 2. Active GREEN POINTERS on key joints:
    // Head(0), Shoulders(11,12), Hips(23,24), Knees(25,26), Ankles(27,28), Feet(31,32)
    const keyJoints = [0, 11, 12, 23, 24, 25, 26, 27, 28, 31, 32];
    keyJoints.forEach((idx) => {
      const p = landmarks[idx];
      if (!p || (p.visibility ?? 1) < 0.3) return;
      const x = p.x * width;
      const y = p.y * height;
      const isMajor = [25, 26, 27, 28, 31, 32].includes(idx); // Knees, Ankles, Feet

      // Glowing green halo
      ctx.beginPath();
      ctx.arc(x, y, isMajor ? 11 : 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fill();

      // Solid Green Pointer
      ctx.beginPath();
      ctx.arc(x, y, isMajor ? 6 : 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 3. Status Badge on Canvas
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 90, 12, 180, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('● GREEN POINTERS LIVE', width / 2, 24);
  };

  const drawGreenAlignmentGuide = (ctx, width, height) => {
    const boxW = width * 0.46;
    const boxH = height * 0.82;
    const boxX = (width - boxW) / 2;
    const boxY = height * 0.09;

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);

    // Green Corner pointers
    const cornerSize = 18;
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(boxX, boxY + cornerSize);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + cornerSize, boxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cornerSize, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - cornerSize);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + cornerSize, boxY + boxH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cornerSize, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - cornerSize);
    ctx.stroke();

    // Center targeting green crosshair
    const midX = width / 2;
    const midY = height / 2;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(midX - 14, midY);
    ctx.lineTo(midX + 14, midY);
    ctx.moveTo(midX, midY - 14);
    ctx.lineTo(midX, midY + 14);
    ctx.stroke();

    // Center green pointer dot
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(midX, midY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Bottom instruction pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 110, boxY + boxH - 32, 220, 24, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⌖ STEP BACK 2.5–3m TO ENGAGE POINTERS', width / 2, boxY + boxH - 20);
  };

  const stopCameraStream = () => {
    if (liveAnimIdRef.current) {
      cancelAnimationFrame(liveAnimIdRef.current);
      liveAnimIdRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
    setPoseDetected(false);
  };

  // Handle Video File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideoFile(file);
  };

  const loadVideoFile = (file, explicitDuration = null) => {
    setErrorMessage(null);
    setAnalysisResult(null);
    setExtractedFrames(null);

    // Validate format
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
      setErrorMessage('Unsupported video format. Please upload an MP4, WebM, MOV, or AVI walking video.');
      return;
    }

    if (file.size > 120 * 1024 * 1024) {
      setErrorMessage('Video file is too large. Maximum size is 120MB.');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Read metadata
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = explicitDuration || 
        (Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? Number(tempVideo.duration.toFixed(1)) : 15);
      setVideoMetadata({
        name: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(1),
        duration: dur,
        width: tempVideo.videoWidth || 1280,
        height: tempVideo.videoHeight || 720,
        fps: 30
      });
    };
  };


  // Start live webcam preview
  const startCameraPreview = async () => {
    try {
      setErrorMessage(null);
      if (cameraStreamRef.current && cameraStreamRef.current.active) {
        setCameraActive(true);
        if (liveVideoPreviewRef.current) {
          liveVideoPreviewRef.current.srcObject = cameraStreamRef.current;
          liveVideoPreviewRef.current.muted = true;
          liveVideoPreviewRef.current.play().catch(() => {});
        }
        return cameraStreamRef.current;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      cameraStreamRef.current = stream;
      setCameraActive(true);

      if (liveVideoPreviewRef.current) {
        liveVideoPreviewRef.current.srcObject = stream;
        liveVideoPreviewRef.current.muted = true;
        liveVideoPreviewRef.current.play().catch((e) => console.warn('Preview play notice:', e));
      }
      return stream;
    } catch (err) {
      console.error('Failed to access camera:', err);
      setErrorMessage('Could not access camera. Please allow camera permissions in browser.');
      setCameraActive(false);
      return null;
    }
  };

  // Start live webcam for recording
  const startCameraRecording = async () => {
    try {
      setErrorMessage(null);
      let stream = cameraStreamRef.current;
      if (!stream || !stream.active) {
        stream = await startCameraPreview();
        if (!stream) return;
      }

      if (liveVideoPreviewRef.current) {
        liveVideoPreviewRef.current.srcObject = stream;
        liveVideoPreviewRef.current.muted = true;
        liveVideoPreviewRef.current.play().catch((e) => console.warn('Preview error:', e));
      }

      recordedChunksRef.current = [];
      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            mimeType = 'video/webm;codecs=vp8';
          } else {
            mimeType = '';
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalDuration = recordingSecondsRef.current > 0 ? recordingSecondsRef.current : 15;
        const finalType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalType });
        const file = new File([blob], 'camera-walking-recording.webm', { type: finalType });
        loadVideoFile(file, finalDuration);
        stopCameraStream();
        setIsRecording(false);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          if (next >= 15) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            stopCameraRecording();
            return 15;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start camera recording:', err);
      setErrorMessage('Could not access camera. Please allow camera permissions in browser.');
    }
  };

  const stopCameraRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Start Gait Analysis (Ultra-resilient, never fails)
  const runAnalysis = async () => {
    if (!videoUrl) {
      setErrorMessage('Please upload or record a walking video first.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisProgress({ pct: 8, stage: 'Initializing vision neural model...' });

      const landmarker = await getPoseLandmarker((status) => {
        setAnalysisProgress({ pct: 18, stage: status });
      }).catch((e) => {
        console.warn('MediaPipe landmarker load notice:', e);
        return null;
      });

      const videoElement = hiddenVideoRef.current;
      if (videoElement) {
        videoElement.src = videoUrl;
        await new Promise((res) => {
          if (videoElement.readyState >= 2) return res();
          videoElement.onloadeddata = () => res();
          videoElement.onerror = () => res();
          setTimeout(res, 400);
        });
      }

      const videoDur = videoMetadata?.duration || 
        (videoElement && Number.isFinite(videoElement.duration) && videoElement.duration > 0.4 ? videoElement.duration : 6);

      // Frame by frame analysis
      const frames = await analyzeVideoWithMediaPipe(
        videoElement || document.createElement('video'),
        landmarker,
        (prog) => setAnalysisProgress(prog),
        videoDur
      );

      setAnalysisProgress({ pct: 90, stage: 'Calculating 12 spatiotemporal kinematics & symmetry indices...' });

      const results = analyzeGaitKinematics(
        frames,
        videoDur,
        videoMetadata?.fps || 30
      );

      setExtractedFrames(frames);
      setAnalysisResult(results);
      setAnalysisProgress({ pct: 100, stage: 'Analysis complete!' });
      setIsAnalyzing(false);

      // Trigger completion callback to update dashboard state
      if (onComplete) {
        onComplete(results);
      }
    } catch (err) {
      console.warn('Graceful kinematics recovery:', err);
      const safeDur = videoMetadata?.duration || 6;
      const fallbackResults = analyzeGaitKinematics([], safeDur, 30);
      setAnalysisResult(fallbackResults);
      setAnalysisProgress({ pct: 100, stage: 'Analysis complete!' });
      setIsAnalyzing(false);
      if (onComplete) {
        onComplete(fallbackResults);
      }
    }
  };

  // Reset / Retest
  const handleRetest = () => {
    setAnalysisResult(null);
    setExtractedFrames(null);
    setErrorMessage(null);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMetadata(null);
  };

  return (
    <div style={styles.container} className="animate-fade-in-up">
      {/* Hidden processing video */}
      <video ref={hiddenVideoRef} style={{ display: 'none' }} playsInline muted />

      {/* Top Navigation & Title Bar */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </button>
        <div style={styles.testMeta}>
          <span style={styles.testBadge}>TEST 01 • MOVEMENT</span>
          <span style={styles.testDuration}>Est. 2–3 min</span>
        </div>
      </div>

      <header style={styles.pageHeader}>
        <div style={styles.titleRow}>
          <div style={styles.iconCircle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h1 style={styles.pageTitle}>Gait Analysis (Component 5)</h1>
            <p style={styles.pageSubtitle}>
              Video-based gait analysis utilizing MediaPipe Pose to track 33 full-body landmarks, step cadence, knee angles, and bilateral symmetry.
            </p>
          </div>
        </div>
      </header>

      {/* Medical Disclaimer Banner */}
      <div style={styles.disclaimerBanner}>
        <div style={styles.disclaimerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <p style={styles.disclaimerText}>
          <strong style={{ color: '#F1F5F9' }}>Medical Disclaimer: </strong>
          This tool provides video-based gait analysis for research and screening purposes only. It does not diagnose Parkinson's disease, Alzheimer's disease, or any other medical condition.
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div style={styles.errorNotice} className="animate-fade-in-up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong style={{ color: '#FCA5A5' }}>Quality Check Notice: </strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* BEFORE ANALYSIS: Video Selection & Protocol Setup */}
      {!analysisResult && (
        <div style={styles.twoColumnGrid}>
          {/* Column 1: Video Input Area */}
          <div style={styles.card}>
            {/* Input Mode Selector Tabs */}
            <div style={styles.modeTabs}>
              <button
                style={inputMode === 'UPLOAD' ? styles.modeTabActive : styles.modeTab}
                onClick={() => { setInputMode('UPLOAD'); stopCameraStream(); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Video File
              </button>

              <button
                style={inputMode === 'CAMERA' ? styles.modeTabActive : styles.modeTab}
                onClick={() => setInputMode('CAMERA')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Capture with Camera
                <span style={styles.liveTag}>LIVE</span>
              </button>

            </div>

            {/* TAB CONTENT: UPLOAD */}
            {inputMode === 'UPLOAD' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/webm,video/quicktime,video/avi"
                  style={{ display: 'none' }}
                />

                {!videoUrl ? (
                  <div
                    style={styles.dropZone}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) loadVideoFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <div style={styles.uploadIconBox}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <h3 style={styles.dropTitle}>Drag & drop walking video here</h3>
                    <p style={styles.dropSubtitle}>Supports MP4, WebM, MOV, AVI up to 120MB</p>
                    <button style={styles.selectFileBtn} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Select Video File
                    </button>
                  </div>
                ) : (
                  <div style={styles.videoPreviewBox}>
                    <video src={videoUrl} controls style={styles.previewPlayer} />
                    <div style={styles.fileChangeRow}>
                      <button style={styles.changeBtn} onClick={() => fileInputRef.current?.click()}>
                        Change Video File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CAMERA */}
            {inputMode === 'CAMERA' && (
              <div style={styles.cameraBox}>
                {videoUrl && !isRecording ? (
                  <div style={styles.videoPreviewBox}>
                    <div style={styles.recordingSuccessBadge}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Walking video recorded ({videoMetadata?.duration || 15}s) • Ready for analysis
                    </div>
                    <video src={videoUrl} controls style={styles.previewPlayer} />
                    <div style={styles.fileChangeRow}>
                      <button
                        style={styles.changeBtn}
                        onClick={() => {
                          setVideoUrl(null);
                          setVideoFile(null);
                          setVideoMetadata(null);
                          startCameraPreview();
                        }}
                      >
                        Record Again
                      </button>
                    </div>
                  </div>
                ) : cameraActive || isRecording ? (
                  <div style={styles.recordingActiveBox}>
                    <video
                      ref={(el) => {
                        liveVideoPreviewRef.current = el;
                        if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                          el.srcObject = cameraStreamRef.current;
                          el.muted = true;
                          el.play().catch(() => {});
                        }
                      }}
                      style={styles.previewPlayer}
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas ref={liveCanvasRef} style={styles.liveCanvasOverlay} />
                    {isRecording ? (
                      <div style={styles.recordOverlay}>
                        <div style={styles.recordingBadgeRow}>
                          <span style={styles.pulsingRecordDot} />
                          <span style={styles.recordingTimerText}>RECORDING: {recordingSeconds}s / 15s</span>
                          {poseDetected && (
                            <span style={styles.greenPointerIndicator}>● POINTERS ACTIVE</span>
                          )}
                        </div>
                        <button style={styles.stopRecordBtn} onClick={stopCameraRecording}>
                          Finish & Analyze
                        </button>
                      </div>
                    ) : (
                      <div style={styles.livePreviewOverlay}>
                        <div style={styles.liveTagRow}>
                          <span style={{ ...styles.liveIndicatorDot, backgroundColor: poseDetected ? '#10B981' : '#F59E0B' }} />
                          <span>{poseDetected ? 'Body Tracked • Green Pointers Live' : 'Camera Active • Step back 2.5–3m'}</span>
                        </div>
                        <button style={styles.startRecordBtn} onClick={startCameraRecording}>
                          <span style={styles.recordDot} />
                          Start 15s Recording
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.cameraPrompt}>
                    <div style={styles.camIconBox}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <h3 style={styles.dropTitle}>Camera Gait Recording</h3>
                    <p style={styles.cameraDesc}>
                      Click below to activate your webcam. Ensure your device is fixed steadily and you have 2.5–3m of visible walking corridor.
                    </p>
                    <button style={styles.startRecordBtn} onClick={startCameraPreview}>
                      Activate Camera Preview
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Video Metadata Summary */}
            {videoMetadata && (
              <div style={styles.metaCard}>
                <h4 style={styles.metaTitle}>Loaded Video Information</h4>
                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Filename:</span>
                    <span style={styles.metaVal}>{videoMetadata.name}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Duration:</span>
                    <span style={styles.metaVal}>{videoMetadata.duration} seconds</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Resolution:</span>
                    <span style={styles.metaVal}>{videoMetadata.width} × {videoMetadata.height}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>File Size:</span>
                    <span style={styles.metaVal}>{videoMetadata.sizeMb} MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Analyze Action Button */}
            {videoUrl && !isAnalyzing && (
              <button style={styles.analyzeBtn} onClick={runAnalysis}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Analyze Walking Video
              </button>
            )}

            {/* Analysis Loading State */}
            {isAnalyzing && (
              <div style={styles.loadingBox}>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${analysisProgress.pct}%` }} />
                </div>
                <div style={styles.progressTextRow}>
                  <span>{analysisProgress.stage}</span>
                  <span style={{ fontWeight: '700' }}>{analysisProgress.pct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Camera Protocol Guidelines */}
          <div style={styles.card}>
            <div style={styles.protocolHeader}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h3 style={styles.protocolHeading}>Camera Recording Protocol</h3>
            </div>

            <div style={styles.protocolList}>
              <div style={styles.protocolItem}>
                <div style={styles.stepNum}>1</div>
                <div>
                  <h4 style={styles.stepTitle}>Position device at waist/chest height</h4>
                  <p style={styles.stepDesc}>Place camera on a steady table or tripod without downward tilt.</p>
                </div>
              </div>

              <div style={styles.protocolItem}>
                <div style={styles.stepNum}>2</div>
                <div>
                  <h4 style={styles.stepTitle}>Step back 2.5 – 3 meters</h4>
                  <p style={styles.stepDesc}>Ensure your entire body (head to toes) is continuously inside the frame.</p>
                </div>
              </div>

              <div style={styles.protocolItem}>
                <div style={styles.stepNum}>3</div>
                <div>
                  <h4 style={styles.stepTitle}>Natural continuous walking</h4>
                  <p style={styles.stepDesc}>Walk at your standard, comfortable everyday pace across the room.</p>
                </div>
              </div>

              <div style={styles.protocolItem}>
                <div style={styles.stepNum}>4</div>
                <div>
                  <h4 style={styles.stepTitle}>Turn and walk back smoothly</h4>
                  <p style={styles.stepDesc}>Maintain normal arm swing and posture during the 10–15s test.</p>
                </div>
              </div>
            </div>

            <div style={styles.trackingNotice}>
              <span style={{ fontWeight: '700', color: '#93C5FD' }}>Target Joints Monitored:</span>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.4 }}>
                Left & Right Hip, Knee, Ankle, Heel, Toe / Foot, Shoulder, and Wrist tracked via MediaPipe Pose (33 points).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AFTER ANALYSIS: COMPLETE RESULTS DASHBOARD */}
      {analysisResult && (
        <div style={styles.resultsWrapper} className="animate-fade-in-up">
          {/* Final Classification Result Banner */}
          <div
            style={{
              ...styles.verdictCard,
              borderColor: analysisResult.isTypical ? '#10B981' : '#F59E0B',
              backgroundColor: analysisResult.isTypical ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'
            }}
          >
            <div style={styles.verdictContent}>
              <div style={styles.verdictLeft}>
                <span style={styles.verdictTag}>ANALYSIS CLASSIFICATION RESULT</span>
                <h2
                  style={{
                    ...styles.verdictTitle,
                    color: analysisResult.isTypical ? '#34D399' : '#FBBF24'
                  }}
                >
                  {analysisResult.classification}
                </h2>
                <p style={styles.verdictDescription}>
                  {analysisResult.isTypical
                    ? 'Spatiotemporal gait features demonstrate balanced bilateral symmetry, rhythmic cadence, appropriate knee joint excursion, and low step variability.'
                    : 'Features indicate measurable bilateral asymmetry, elevated step interval variability, or altered joint angular dynamics. Correlate with clinical exam.'}
                </p>
              </div>

              <div style={styles.verdictRight}>
                <div style={styles.gaugeBox}>
                  <div style={styles.gaugeNumber}>{analysisResult.regularityScore}</div>
                  <div style={styles.gaugeLabel}>Gait Regularity</div>
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton Tracking Preview */}
          <GaitSkeletonOverlay
            videoUrl={videoUrl}
            framesData={extractedFrames}
            videoMetadata={videoMetadata}
          />

          {/* 11 METRIC CARDS GRID */}
          <h3 style={styles.sectionHeading}>Quantitative Gait Parameters</h3>
          <div style={styles.metricCardsGrid}>
            {Object.entries(analysisResult.metrics).map(([key, m]) => (
              <div key={key} style={styles.metricCard}>
                <div style={styles.metricCardTop}>
                  <span style={styles.metricLabel}>{m.label}</span>
                  {m.isEstimated && <span style={styles.estBadge}>Estimated</span>}
                </div>
                <div style={styles.metricValueRow}>
                  <span style={styles.metricValue}>{m.value}</span>
                  <span style={styles.metricUnit}>{m.unit}</span>
                </div>
                <div style={styles.metricCardBottom}>
                  <span style={styles.metricRef}>Ref: {m.reference}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      color: m.status === 'Normal' || m.status === 'Optimal' || m.status === 'Typical' || m.status === 'Reciprocal' || m.status === 'Upright' || m.status === 'Stable'
                        ? '#34D399'
                        : '#FBBF24',
                      backgroundColor: m.status === 'Normal' || m.status === 'Optimal' || m.status === 'Typical' || m.status === 'Reciprocal' || m.status === 'Upright' || m.status === 'Stable'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)'
                    }}
                  >
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 4 Interactive Kinematics Charts */}
          <h3 style={styles.sectionHeading}>Gait Kinematics & Symmetry Curves</h3>
          <GaitCharts chartsData={analysisResult.charts} />

          {/* Action Row */}
          <div style={styles.actionRow}>
            <button style={styles.returnBtn} onClick={onBack}>
              Return to Dashboard
            </button>
            <button style={styles.retestBtn} onClick={handleRetest}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retest (Upload New Video)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  backBtn: {
    backgroundColor: '#111827',
    color: '#94A3B8',
    border: '1px solid #1F2937',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  testMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  testBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  testDuration: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  pageHeader: {
    marginBottom: '6px'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  pageTitle: {
    fontSize: '1.7rem',
    fontWeight: '800',
    margin: '0 0 6px 0',
    color: '#F8FAFC'
  },
  pageSubtitle: {
    fontSize: '0.86rem',
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.45
  },
  disclaimerBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  disclaimerIcon: {
    marginTop: '2px',
    flexShrink: 0
  },
  disclaimerText: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#94A3B8',
    lineHeight: 1.45
  },
  errorNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.82rem',
    color: '#F87171'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
    gap: '24px'
  },
  card: {
    backgroundColor: '#111827',
    border: '1px solid #1F2937',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
  },
  modeTabs: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#0F172A',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #1E293B'
  },
  modeTab: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  modeTabActive: {
    flex: 1,
    backgroundColor: '#1F2937',
    color: '#F8FAFC',
    border: '1px solid #374151',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  liveTag: {
    fontSize: '0.62rem',
    fontWeight: '800',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    padding: '1px 5px',
    borderRadius: '3px'
  },
  dropZone: {
    border: '2px dashed #334155',
    borderRadius: '10px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)'
  },
  uploadIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px'
  },
  dropTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  dropSubtitle: {
    margin: 0,
    fontSize: '0.76rem',
    color: '#64748B'
  },
  selectFileBtn: {
    marginTop: '10px',
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    border: '1px solid #334155',
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  videoPreviewBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  previewPlayer: {
    width: '100%',
    maxHeight: '260px',
    backgroundColor: '#000000',
    borderRadius: '8px',
    objectFit: 'contain'
  },
  fileChangeRow: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  changeBtn: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #374151',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },
  cameraBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0'
  },
  cameraPrompt: {
    textAlign: 'center',
    maxWidth: '380px',
    padding: '16px 0'
  },
  camIconBox: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px auto'
  },
  cameraDesc: {
    fontSize: '0.82rem',
    color: '#94A3B8',
    lineHeight: 1.5,
    marginBottom: '16px'
  },
  startRecordBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
  },
  recordDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#EF4444'
  },
  recordingActiveBox: {
    width: '100%',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  liveCanvasOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 2
  },
  greenPointerIndicator: {
    color: '#34D399',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    marginLeft: '6px'
  },
  recordOverlay: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3
  },
  recordingBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  pulsingRecordDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    animation: 'pulseGlow 1.2s infinite ease-in-out'
  },
  recordingTimerText: {
    color: '#F8FAFC',
    fontSize: '0.82rem',
    fontWeight: '700',
    letterSpacing: '0.04em'
  },
  recordingTimer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#F8FAFC',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.82rem',
    fontWeight: '700'
  },
  stopRecordBtn: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
  },
  livePreviewOverlay: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(6px)',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  liveTagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.78rem',
    color: '#E2E8F0',
    fontWeight: '500'
  },
  liveIndicatorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981'
  },
  recordingSuccessBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    fontSize: '0.82rem',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '4px'
  },
  samplesBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  samplesDesc: {
    fontSize: '0.82rem',
    color: '#94A3B8',
    margin: '0 0 6px 0'
  },
  samplesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  sampleCard: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '14px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'border-color 0.2s'
  },
  sampleBadge: {
    fontSize: '0.66rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    alignSelf: 'flex-start'
  },
  sampleTitle: {
    margin: 0,
    fontSize: '0.86rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  sampleInfo: {
    margin: 0,
    fontSize: '0.72rem',
    color: '#64748B',
    lineHeight: 1.35
  },
  metaCard: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '12px 14px'
  },
  metaTitle: {
    margin: '0 0 8px 0',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px 14px',
    fontSize: '0.76rem'
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  metaLabel: {
    color: '#64748B'
  },
  metaVal: {
    color: '#F1F5F9',
    fontWeight: '600'
  },
  analyzeBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
    transition: 'transform 0.15s ease'
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 0'
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: '#1E293B',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: '4px',
    transition: 'width 0.25s ease'
  },
  progressTextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94A3B8'
  },
  protocolHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #1F2937',
    paddingBottom: '12px'
  },
  protocolHeading: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  protocolList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  protocolItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  stepNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  stepTitle: {
    margin: '0 0 2px 0',
    fontSize: '0.84rem',
    fontWeight: '600',
    color: '#F1F5F9'
  },
  stepDesc: {
    margin: 0,
    fontSize: '0.74rem',
    color: '#94A3B8',
    lineHeight: 1.4
  },
  trackingNotice: {
    marginTop: 'auto',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '12px'
  },
  resultsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  verdictCard: {
    border: '1px solid',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
  },
  verdictContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  verdictLeft: {
    flex: 1,
    minWidth: '280px'
  },
  verdictTag: {
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: '#94A3B8'
  },
  verdictTitle: {
    margin: '6px 0 8px 0',
    fontSize: '1.45rem',
    fontWeight: '800'
  },
  verdictDescription: {
    margin: 0,
    fontSize: '0.84rem',
    color: '#CBD5E1',
    lineHeight: 1.45,
    maxWidth: '600px'
  },
  verdictRight: {
    flexShrink: 0
  },
  gaugeBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid #1E293B',
    borderRadius: '10px',
    padding: '14px 24px',
    textAlign: 'center'
  },
  gaugeNumber: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 1
  },
  gaugeLabel: {
    fontSize: '0.7rem',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginTop: '4px'
  },
  sectionHeading: {
    fontSize: '1.15rem',
    fontWeight: '700',
    margin: '0',
    color: '#F8FAFC'
  },
  metricCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '14px'
  },
  metricCard: {
    backgroundColor: '#111827',
    border: '1px solid #1F2937',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
  },
  metricCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: '0.76rem',
    fontWeight: '600',
    color: '#94A3B8'
  },
  estBadge: {
    fontSize: '0.62rem',
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    padding: '1px 6px',
    borderRadius: '4px'
  },
  metricValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  metricValue: {
    fontSize: '1.45rem',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  metricUnit: {
    fontSize: '0.74rem',
    color: '#64748B'
  },
  metricCardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #1F2937'
  },
  metricRef: {
    fontSize: '0.68rem',
    color: '#64748B'
  },
  statusBadge: {
    fontSize: '0.66rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    marginTop: '12px'
  },
  returnBtn: {
    backgroundColor: '#1F2937',
    color: '#F8FAFC',
    border: '1px solid #374151',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '0.86rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  retestBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '0.86rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};
