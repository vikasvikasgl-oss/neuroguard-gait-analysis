import React, { useState, useEffect } from 'react';

/**
 * FingerTappingInstruction Component
 * 
 * Shows a simple hand tapping animation, loops instructions, and runs a 3-2-1-START countdown.
 * 
 * @param {string} hand "Right" or "Left" hand under test
 * @param {Function} onComplete Callback triggered when the countdown finishes
 */
export default function FingerTappingInstruction({ hand = "Right", onComplete }) {
  const instructions = [
    "Place your hand in front of the camera.",
    "Keep your thumb and index finger visible.",
    "Tap your index finger and thumb together repeatedly.",
    "Keep your hand inside the frame."
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [countdown, setCountdown] = useState(null); // null, 3, 2, 1, 'START'

  // Cycle instructions text slowly
  useEffect(() => {
    if (countdown !== null) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % instructions.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [countdown, instructions.length]);

  // Handle countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 'START') {
      const startTimer = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(startTimer);
    }

    const timer = setTimeout(() => {
      if (countdown === 3) setCountdown(2);
      else if (countdown === 2) setCountdown(1);
      else if (countdown === 1) setCountdown('START');
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  const handleStartCountdown = () => {
    setCountdown(3);
  };

  return (
    <div style={styles.cardContainer}>
      <style dangerouslySetInnerHTML={{ __html: cssAnimations }} />

      {/* Countdown Full Card Overlay */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <div style={styles.countdownBox} className="countdown-pulse">
            <span style={styles.countdownSub}>PREPARE YOUR {hand.toUpperCase()} HAND</span>
            <h1 style={styles.countdownNumber}>
              {countdown}
            </h1>
          </div>
        </div>
      )}

      {/* Sleek Header */}
      <div style={styles.header}>
        <span style={styles.handBadge}>
          {hand.toUpperCase()} HAND TRIAL
        </span>
        <h2 style={styles.title}>Finger-Tapping Test</h2>
        <p style={styles.subtitle}>
          Visual training guide for camera-only motor coordination scanning
        </p>
      </div>

      {/* Grid: Hand Animation & Instructions List */}
      <div style={styles.gridContent}>
        
        {/* Hand Animation Stage */}
        <div style={styles.animationPanel}>
          <div style={styles.canvasStage}>
            
            {/* Inline SVG Hand with precise rotation pivots & glow */}
            <svg viewBox="0 0 320 320" style={styles.svgHand}>
              <defs>
                <filter id="fingerGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                
                <linearGradient id="neonBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>

                <linearGradient id="neutralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>

              {/* Hand Stationary Base */}
              <g>
                <path d="M 100,285 L 100,320 M 150,285 L 150,320" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
                <rect x="85" y="280" width="80" height="12" rx="6" fill="#1E293B" />
                <path d="M 100,280 C 100,215 120,195 160,190" stroke="url(#neutralGrad)" strokeWidth="20" strokeLinecap="round" fill="none" opacity="0.8" />
                <path d="M 160,220 C 180,220 185,235 175,245 C 165,250 150,245 145,245" stroke="url(#neutralGrad)" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.6" />
                <path d="M 150,245 C 170,245 175,260 165,270 C 155,275 140,270 135,270" stroke="url(#neutralGrad)" strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.5" />
                <path d="M 140,270 C 158,270 163,285 153,295 C 143,300 130,295 125,295" stroke="url(#neutralGrad)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.4" />
              </g>

              {/* Contact Glow Ripple */}
              <circle cx="240" cy="190" r="18" fill="none" stroke="#60A5FA" strokeWidth="3.5" filter="url(#fingerGlow)" className="tap-glow-wave" />
              <circle cx="240" cy="190" r="6" fill="#93C5FD" className="tap-glow-dot" />

              {/* Index Finger (moving) - Pivot at 160, 165 */}
              <g className="index-finger-animate">
                <path d="M 160,165 C 185,160 215,175 240,190" stroke="url(#neonBlueGrad)" strokeWidth="20" strokeLinecap="round" fill="none" filter="url(#fingerGlow)" />
              </g>

              {/* Thumb (moving) - Pivot at 130, 235 */}
              <g className="thumb-finger-animate">
                <path d="M 130,235 C 165,237 205,220 240,190" stroke="url(#neonBlueGrad)" strokeWidth="22" strokeLinecap="round" fill="none" filter="url(#fingerGlow)" />
              </g>
            </svg>

            {/* Ripple Pulse Rings Behind the Hand */}
            <div style={styles.rippleRing1} />
            <div style={styles.rippleRing2} />
          </div>

          {/* Large instruction focus block */}
          <div style={styles.focalTextCard}>
            <span style={styles.stepCounter}>TRIAL INSTRUCTION</span>
            <div key={activeStep} style={styles.focalText} className="text-fade-in">
              {instructions[activeStep]}
            </div>
          </div>
        </div>

        {/* Steps List Panel */}
        <div style={styles.instructionsPanel}>
          <h4 style={styles.panelTitle}>Assessment Rules</h4>
          <div style={styles.stepsList}>
            {instructions.map((step, idx) => {
              const isActive = idx === activeStep;
              return (
                <div 
                  key={idx} 
                  style={{
                    ...styles.stepRow,
                    ...(isActive ? styles.stepRowActive : {}),
                    opacity: isActive ? 1 : 0.4
                  }}
                >
                  <div style={styles.dotColumn}>
                    <div style={{ ...styles.stepDot, ...(isActive ? styles.stepDotActive : {}) }} />
                    {idx < instructions.length - 1 && <div style={styles.stepConnector} />}
                  </div>
                  <span style={{ ...styles.stepText, ...(isActive ? styles.stepTextActive : {}) }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Start Trial Action */}
      <div style={styles.actionsBar}>
        <button onClick={handleStartCountdown} style={styles.primaryButton} className="btn-scale-glow">
          <span style={styles.buttonText}>Start {hand} Hand Test</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <span style={styles.fineprint}>
          Tapping cycles are strictly normalized using real-time geometric palm tracking.
        </span>
      </div>
    </div>
  );
}

const cssAnimations = `
  /* Keyframes for Index Finger Tapping */
  @keyframes indexTapAnimate {
    0%, 25%, 100% { transform: rotate(-24deg); }
    52%, 72% { transform: rotate(0deg); }
  }

  /* Keyframes for Thumb Tapping */
  @keyframes thumbTapAnimate {
    0%, 25%, 100% { transform: rotate(24deg); }
    52%, 72% { transform: rotate(0deg); }
  }

  /* Contact Glow Ripple Animation */
  @keyframes contactGlowAnimate {
    0%, 48%, 76%, 100% { transform: scale(0.3); opacity: 0; }
    52% { transform: scale(1); opacity: 0.9; }
    70% { transform: scale(2.2); opacity: 0; }
  }

  /* Contact Glow Center Point Pulse */
  @keyframes contactDotAnimate {
    0%, 48%, 76%, 100% { transform: scale(0); opacity: 0; }
    52% { transform: scale(1.3); opacity: 1; }
    70% { transform: scale(0.8); opacity: 0; }
  }

  /* Ambient Ripples on Stage */
  @keyframes stageRipple {
    0% { transform: scale(0.7); opacity: 0.05; }
    50% { transform: scale(1.2); opacity: 0.15; }
    100% { transform: scale(1.7); opacity: 0; }
  }

  /* Micro-fade-in for active text step transitions */
  @keyframes focalTextFadeIn {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* CountDown Pulse Zoom Animation */
  @keyframes countdownZoom {
    0% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.8; }
  }

  .index-finger-animate {
    transform-origin: 160px 165px;
    animation: indexTapAnimate 1.4s infinite ease-in-out;
  }

  .thumb-finger-animate {
    transform-origin: 130px 235px;
    animation: thumbTapAnimate 1.4s infinite ease-in-out;
  }

  .tap-glow-wave {
    transform-origin: 240px 190px;
    animation: contactGlowAnimate 1.4s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .tap-glow-dot {
    transform-origin: 240px 190px;
    animation: contactDotAnimate 1.4s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .text-fade-in {
    animation: focalTextFadeIn 0.35s ease-out forwards;
  }

  .countdown-pulse {
    animation: countdownZoom 1.0s infinite ease-in-out;
  }

  .btn-scale-glow {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-scale-glow:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 16px rgba(59, 130, 246, 0.5);
    background-color: #2563EB !important;
  }
`;

const styles = {
  cardContainer: {
    backgroundColor: '#111827',
    borderRadius: '12px',
    border: '1px solid #1F2937',
    padding: '24px',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#F9FAFB',
    position: 'relative',
    overflow: 'hidden',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.96)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  countdownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownSub: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: '0.15em',
    marginBottom: '8px',
  },
  countdownNumber: {
    fontSize: '7rem',
    fontWeight: '900',
    color: '#FFFFFF',
    margin: 0,
    textShadow: '0 0 24px rgba(59, 130, 246, 0.8)',
    fontFamily: 'monospace, sans-serif',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderBottom: '1px solid #1F2937',
    paddingBottom: '16px',
    position: 'relative',
  },
  handBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: '#1E293B',
    color: '#60A5FA',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    padding: '4px 10px',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.82rem',
    color: '#9CA3AF',
  },
  gridContent: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
    gap: '24px',
    alignItems: 'stretch',
  },
  animationPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  canvasStage: {
    position: 'relative',
    height: '240px',
    backgroundColor: '#030712',
    borderRadius: '8px',
    border: '1px solid #1F2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  svgHand: {
    width: '90%',
    height: '90%',
    maxWidth: '220px',
    zIndex: 2,
  },
  rippleRing1: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    border: '1px solid rgba(59, 130, 246, 0.08)',
    pointerEvents: 'none',
    animation: 'stageRipple 4s infinite linear',
    zIndex: 1,
  },
  rippleRing2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    border: '1px solid rgba(59, 130, 246, 0.08)',
    pointerEvents: 'none',
    animation: 'stageRipple 4s infinite linear',
    animationDelay: '2s',
    zIndex: 1,
  },
  focalTextCard: {
    backgroundColor: '#1F2937',
    borderRadius: '6px',
    padding: '12px 16px',
    borderLeft: '4px solid #3B82F6',
    minHeight: '74px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '4px',
    boxSizing: 'border-box',
  },
  stepCounter: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: '0.05em',
  },
  focalText: {
    fontSize: '0.88rem',
    fontWeight: '500',
    color: '#E2E8F0',
    lineHeight: 1.4,
  },
  instructionsPanel: {
    backgroundColor: '#111827',
    borderRadius: '8px',
    border: '1px solid #1F2937',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  panelTitle: {
    margin: 0,
    fontSize: '0.88rem',
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #1F2937',
    paddingBottom: '8px',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    flex: 1,
  },
  stepRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '8px 0',
    transition: 'all 0.3s ease',
  },
  stepRowActive: {
    transform: 'translateX(4px)',
  },
  dotColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    height: '100%',
    minHeight: '36px',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#4B5563',
    transition: 'all 0.3s ease',
    marginTop: '6px',
  },
  stepDotActive: {
    backgroundColor: '#60A5FA',
    boxShadow: '0 0 8px #60A5FA',
    transform: 'scale(1.2)',
  },
  stepConnector: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: '#1E293B',
    minHeight: '20px',
    marginTop: '4px',
    marginBottom: '-8px',
  },
  stepText: {
    fontSize: '0.82rem',
    color: '#9CA3AF',
    lineHeight: 1.4,
    transition: 'color 0.3s ease',
  },
  stepTextActive: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  actionsBar: {
    borderTop: '1px solid #1F2937',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 28px',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    maxWidth: '280px',
    justifyContent: 'center',
  },
  buttonText: {
    letterSpacing: '-0.01em',
  },
  fineprint: {
    fontSize: '0.72rem',
    color: '#6B7280',
    textAlign: 'center',
  },
};
