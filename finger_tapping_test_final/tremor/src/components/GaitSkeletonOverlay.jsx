import React, { useRef, useEffect, useState } from 'react';
import { SKELETON_CONNECTIONS, LANDMARK_INDEX, calculateAngle } from '../utils/gaitKinematics.js';

export default function GaitSkeletonOverlay({ videoUrl, framesData, videoMetadata }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const animFrameId = useRef(null);

  // Synchronize canvas dimensions with video
  const updateCanvasSize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.clientWidth || 640;
      canvas.height = video.clientHeight || 360;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  // Find closest landmark frame for current video time
  const getLandmarksForTime = (time) => {
    if (!framesData || framesData.length === 0) return null;
    let closest = framesData[0];
    let minDiff = Math.abs(framesData[0].time - time);

    for (let i = 1; i < framesData.length; i++) {
      const diff = Math.abs(framesData[i].time - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = framesData[i];
      }
    }
    return closest ? closest.landmarks : null;
  };

  const drawSkeleton = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const landmarks = getLandmarksForTime(video.currentTime);
    if (!landmarks || landmarks.length < 33) return;

    // Draw connection lines
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    SKELETON_CONNECTIONS.forEach(([i1, i2]) => {
      const p1 = landmarks[i1];
      const p2 = landmarks[i2];
      if (!p1 || !p2) return;

      // Color coding: Left side cyan, Right side amber/rose, Center white
      const isLeft = (i1 % 2 !== 0 && i2 % 2 !== 0) || (i1 === 11 && i2 === 13) || (i1 === 23 && i2 === 25);
      const isRight = (i1 % 2 === 0 && i2 % 2 === 0) || (i1 === 12 && i2 === 14) || (i1 === 24 && i2 === 26);

      if (isLeft) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; // Sky blue
      } else if (isRight) {
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)'; // Orange
      } else {
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)'; // White/slate
      }

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Draw joints
    const keyJoints = [
      LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.RIGHT_HIP,
      LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.RIGHT_KNEE,
      LANDMARK_INDEX.LEFT_ANKLE, LANDMARK_INDEX.RIGHT_ANKLE,
      LANDMARK_INDEX.LEFT_HEEL, LANDMARK_INDEX.RIGHT_HEEL,
      LANDMARK_INDEX.LEFT_FOOT_INDEX, LANDMARK_INDEX.RIGHT_FOOT_INDEX,
      LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.RIGHT_SHOULDER,
      LANDMARK_INDEX.LEFT_WRIST, LANDMARK_INDEX.RIGHT_WRIST
    ];

    landmarks.forEach((p, idx) => {
      if (!p) return;
      const isKey = keyJoints.includes(idx);
      const radius = isKey ? 5.5 : 3.5;
      const x = p.x * width;
      const y = p.y * height;

      // Green halo for key joints
      if (isKey) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (
        idx === LANDMARK_INDEX.LEFT_KNEE ||
        idx === LANDMARK_INDEX.LEFT_ANKLE ||
        idx === LANDMARK_INDEX.LEFT_HEEL ||
        idx === LANDMARK_INDEX.LEFT_FOOT_INDEX ||
        idx === LANDMARK_INDEX.RIGHT_KNEE ||
        idx === LANDMARK_INDEX.RIGHT_ANKLE ||
        idx === LANDMARK_INDEX.RIGHT_HEEL ||
        idx === LANDMARK_INDEX.RIGHT_FOOT_INDEX
      ) {
        ctx.fillStyle = '#10B981'; // Vibrant Green Pointer
        ctx.strokeStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#FFFFFF';
      }
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });

    // Draw real-time Knee Angle tags
    const lHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
    const lKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
    const lAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
    const rHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
    const rKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];
    const rAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

    const lAngle = calculateAngle(lHip, lKnee, lAnkle);
    const rAngle = calculateAngle(rHip, rKnee, rAnkle);

    ctx.font = 'bold 11px Inter, sans-serif';
    if (lAngle !== null && lKnee) {
      const tagText = `L: ${Math.round(lAngle)}°`;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(lKnee.x * width - 42, lKnee.y * height - 8, 38, 16);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(tagText, lKnee.x * width - 40, lKnee.y * height + 4);
    }
    if (rAngle !== null && rKnee) {
      const tagText = `R: ${Math.round(rAngle)}°`;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(rKnee.x * width + 8, rKnee.y * height - 8, 38, 16);
      ctx.fillStyle = '#FB923C';
      ctx.fillText(tagText, rKnee.x * width + 10, rKnee.y * height + 4);
    }
  };

  const renderLoop = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      drawSkeleton();
    }
    animFrameId.current = requestAnimationFrame(renderLoop);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
      animFrameId.current = requestAnimationFrame(renderLoop);
    } else {
      video.pause();
      setIsPlaying(false);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      drawSkeleton();
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackRate(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const formatSecs = (sec) => {
    const s = Math.floor(sec || 0);
    const ms = Math.floor(((sec || 0) % 1) * 10);
    return `${s}.${ms}s`;
  };

  return (
    <div style={styles.container}>
      {/* Top Banner with Tracking Info */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            <span>POSE TRACKING PREVIEW</span>
          </div>
          <span style={styles.modelBadge}>MediaPipe Pose (33 Landmarks)</span>
        </div>
        <div style={styles.legendRow}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#38BDF8' }} />
            <span>Left Limb</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#FB923C' }} />
            <span>Right Limb</span>
          </div>
        </div>
      </div>

      {/* Video & Canvas Overlay Box */}
      <div style={styles.videoWrapper}>
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          loop
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              updateCanvasSize();
              drawSkeleton();
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={styles.video}
        />
        <canvas ref={canvasRef} style={styles.canvas} onClick={handlePlayPause} />

        {/* Play/Pause Center Overlay button if paused */}
        {!isPlaying && (
          <div style={styles.centerPlayBtn} onClick={handlePlayPause}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div style={styles.controlsBar}>
        <button style={styles.playBtn} onClick={handlePlayPause}>
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <span style={styles.timeLabel}>
          {formatSecs(currentTime)} / {formatSecs(duration)}
        </span>

        {/* Timeline Slider */}
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          style={styles.scrubber}
        />

        {/* Speed toggle */}
        <button style={styles.speedBtn} onClick={handleSpeedToggle}>
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    marginBottom: '24px'
  },
  headerBar: {
    padding: '12px 16px',
    backgroundColor: '#111827',
    borderBottom: '1px solid #1F2937',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.06em'
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#38BDF8',
    boxShadow: '0 0 8px #38BDF8'
  },
  modelBadge: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #334155'
  },
  legendRow: {
    display: 'flex',
    gap: '14px',
    fontSize: '0.74rem',
    color: '#CBD5E1'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '340px'
  },
  video: {
    width: '100%',
    maxHeight: '440px',
    display: 'block',
    objectFit: 'contain'
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer'
  },
  centerPlayBtn: {
    position: 'absolute',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    transition: 'transform 0.2s',
    pointerEvents: 'auto'
  },
  controlsBar: {
    padding: '10px 16px',
    backgroundColor: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  playBtn: {
    backgroundColor: '#1F2937',
    color: '#F8FAFC',
    border: '1px solid #374151',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0
  },
  timeLabel: {
    fontSize: '0.78rem',
    fontFamily: 'monospace',
    color: '#94A3B8',
    minWidth: '85px'
  },
  scrubber: {
    flex: 1,
    accentColor: '#38BDF8',
    cursor: 'pointer'
  },
  speedBtn: {
    backgroundColor: '#1F2937',
    color: '#93C5FD',
    border: '1px solid #374151',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
