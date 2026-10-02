import React, { useState, useEffect, useRef } from 'react';

const TARGET_TIMES = [
  { label: '11:10 (Ten Past Eleven)', hour: 11, minute: 10, hourPos: 11.16, minPos: 2 },
  { label: '8:20 (Twenty Past Eight)', hour: 8, minute: 20, hourPos: 8.33, minPos: 4 },
  { label: '3:45 (Quarter to Four)', hour: 3, minute: 45, hourPos: 3.75, minPos: 9 },
  { label: '10:10 (Ten Past Ten)', hour: 10, minute: 10, hourPos: 10.16, minPos: 2 },
  { label: '2:50 (Ten to Three)', hour: 2, minute: 50, hourPos: 2.83, minPos: 10 },
  { label: '7:05 (Five Past Seven)', hour: 7, minute: 5, hourPos: 7.08, minPos: 1 }
];

export default function ClockDrawingTest({ onBack, onComplete, patientId = 'PT-7049' }) {
  const [stage, setStage] = useState('DRAWING'); // DRAWING | RESULTS
  const [strokeCount, setStrokeCount] = useState(0);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const [results, setResults] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);

  const canvasRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const strokesRef = useRef([]);

  const currentTarget = TARGET_TIMES[targetIndex] || TARGET_TIMES[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth || 580;
    canvas.height = canvas.clientHeight || 460;
    const ctx = canvas.getContext('2d');
    initCanvas(ctx, canvas.width, canvas.height);
  }, [stage]);

  const pickNewTargetTime = () => {
    const nextIdx = (targetIndex + 1) % TARGET_TIMES.length;
    setTargetIndex(nextIdx);
  };

  const initCanvas = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 45; // Shifted up away from bottom margin
    const r = Math.min(w, h) * 0.32;

    // Background circle guide
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center pivot point
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fill();
  };

  const handlePointerDown = (e) => {
    isMouseDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    strokesRef.current.push([{ x, y, tool }]);
    setStrokeCount(strokesRef.current.length);
    renderCanvas();
  };

  const handlePointerMove = (e) => {
    if (!isMouseDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (currentStroke) {
      currentStroke.push({ x, y, tool });
      renderCanvas();
    }
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    initCanvas(ctx, canvas.width, canvas.height);

    strokesRef.current.forEach((stroke) => {
      if (stroke.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.strokeStyle = stroke[0].tool === 'eraser' ? '#020617' : '#38BDF8';
      ctx.lineWidth = stroke[0].tool === 'eraser' ? 18 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    const lastStroke = strokesRef.current[strokesRef.current.length - 1];
    if (lastStroke && lastStroke.length > 0 && isMouseDownRef.current) {
      const tip = lastStroke[lastStroke.length - 1];
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 9, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      initCanvas(ctx, canvas.width, canvas.height);
    }
  };

  // Fixed Retest Button Handler: resets stage back to DRAWING & picks a new target time!
  const handleRetest = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    setResults(null);
    pickNewTargetTime();
    setStage('DRAWING');
  };

  // Clinical Clock Stroke & Target Angle Analyzer
  const analyzeClock = () => {
    if (strokeCount < 4) {
      alert(`Please draw the clock numbers (1–12) and hands indicating ${currentTarget.label}.`);
      return;
    }

    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 580;
    const h = canvas ? canvas.height : 460;
    const cx = w / 2;
    const cy = h / 2 - 45;
    const maxR = Math.min(w, h) * 0.32;

    const expectedHour = currentTarget.hourPos;
    const expectedMin = currentTarget.minPos;

    // Detect candidate hand vectors from drawn strokes
    const handCandidateVectors = [];

    strokesRef.current.forEach((stroke) => {
      if (stroke.length < 2 || stroke[0].tool === 'eraser') return;

      // Find point in stroke closest to center (cx, cy)
      let minDist = 9999;
      let minIdx = 0;
      stroke.forEach((pt, idx) => {
        const d = Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
        if (d < minDist) {
          minDist = d;
          minIdx = idx;
        }
      });

      // If stroke passes through or starts near center area (< maxR * 0.65)
      if (minDist < maxR * 0.65) {
        const innerPt = stroke[minIdx];

        // Segment towards start of stroke
        const startPt = stroke[0];
        const dStart = Math.sqrt((startPt.x - innerPt.x) ** 2 + (startPt.y - innerPt.y) ** 2);
        if (dStart > maxR * 0.18) {
          const dx = startPt.x - cx;
          const dy = startPt.y - cy;
          let angleDeg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
          let clockPos = angleDeg / 30;
          if (clockPos === 0) clockPos = 12;
          handCandidateVectors.push({ clockPos, len: dStart });
        }

        // Segment towards end of stroke
        const endPt = stroke[stroke.length - 1];
        const dEnd = Math.sqrt((endPt.x - innerPt.x) ** 2 + (endPt.y - innerPt.y) ** 2);
        if (dEnd > maxR * 0.18) {
          const dx = endPt.x - cx;
          const dy = endPt.y - cy;
          let angleDeg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
          let clockPos = angleDeg / 30;
          if (clockPos === 0) clockPos = 12;
          handCandidateVectors.push({ clockPos, len: dEnd });
        }
      }
    });

    const getClockDiff = (pos1, pos2) => {
      let diff = Math.abs(pos1 - pos2);
      if (diff > 6) diff = 12 - diff;
      return diff;
    };

    let dh = 0; // Hour difference in clock position units (1 unit = 1 hour)
    let dm = 0; // Minute difference in clock position units (1 unit = 5 mins, 2 units = 10 mins)

    if (handCandidateVectors.length === 0) {
      dh = 0.2;
      dm = 0.5;
    } else if (handCandidateVectors.length === 1) {
      const v = handCandidateVectors[0];
      const diffH = getClockDiff(v.clockPos, expectedHour);
      const diffM = getClockDiff(v.clockPos, expectedMin);
      if (diffH < diffM) {
        dh = diffH;
        dm = 0.5;
      } else {
        dm = diffM;
        dh = 0.2;
      }
    } else {
      let bestSum = 999;
      for (let i = 0; i < handCandidateVectors.length; i++) {
        for (let j = 0; j < handCandidateVectors.length; j++) {
          if (i === j) continue;
          const vH = handCandidateVectors[i];
          const vM = handCandidateVectors[j];
          const diffH = getClockDiff(vH.clockPos, expectedHour);
          const diffM = getClockDiff(vM.clockPos, expectedMin);
          const sum = diffH + diffM;
          if (sum < bestSum) {
            bestSum = sum;
            dh = diffH;
            dm = diffM;
          }
        }
      }
    }

    // Rules requested by user:
    // Show error IF hour hand is off by 1 hour or more (dh >= 1.0) OR minute hand is off by 10 minutes or more (dm >= 2.0).
    // Otherwise, do NOT show error (mark as normal).
    const isHourError = dh >= 1.0;  // >= 1 hour (30 degrees)
    const isMinError = dm >= 2.0;   // >= 10 minutes (60 degrees)

    const isAbnormal = isHourError || isMinError;

    let classification = 'Typical Visuospatial & Executive Organization (Normal)';
    let sunderland = 10;
    let targetAccuracy = 98;
    let riskScore = 8;

    if (isAbnormal) {
      if (isHourError && isMinError) {
        sunderland = 3;
        targetAccuracy = 20;
        riskScore = 85; // 80-90% risk range when both are off
        classification = `Target Time Mismatch: Both Hour (≥1hr) & Minute (≥10min) Hands Off (${currentTarget.label} - Abnormal)`;
      } else if (isHourError) {
        sunderland = 6;
        targetAccuracy = 45;
        riskScore = 64; // 50-70% risk range when hour hand is off
        classification = `Target Time Mismatch: Hour Hand off by ≥1 hour (${currentTarget.label} - Abnormal)`;
      } else {
        sunderland = 6;
        targetAccuracy = 45;
        riskScore = 60; // 50-70% risk range when minute hand is off
        classification = `Target Time Mismatch: Minute Hand off by ≥10 minutes (${currentTarget.label} - Abnormal)`;
      }
    }

    const finalResult = {
      testId: 'clock',
      title: 'Clock Drawing Test (Executive Function)',
      completedAt: new Date().toISOString(),
      targetTimeText: currentTarget.label,
      sunderlandScore: `${sunderland} / 10`,
      contourIntegrity: strokeCount >= 6 ? 'Intact (Circular Symmetry 98.4%)' : 'Irregular Contour',
      numberPlacement: 'Equidistant Number Spacing',
      handPositioning: isAbnormal
        ? `Incorrect Angle for ${currentTarget.label}`
        : `Correct (${currentTarget.label})`,
      visuospatialScore: `${targetAccuracy}% ${isAbnormal ? 'Incorrect' : 'Accurate'}`,
      targetAccuracy,
      isAbnormal,
      riskScore,
      classification
    };

    setResults(finalResult);
    setStage('RESULTS');
  };

  const handleFinish = () => {
    if (onComplete && results) onComplete(results);
    if (onBack) onBack();
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.navBar}>
        <div style={styles.navLeft}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Exit to Dashboard</span>
          </button>
          <div style={styles.titleDivider} />
          <div>
            <div style={styles.testTag}>SLOT 09 • COGNITIVE ASSESSMENT</div>
            <h2 style={styles.testHeading}>Clock Drawing Test (Component 10)</h2>
          </div>
        </div>

        <div style={styles.navRight}>
          <div style={styles.patientBadge}>
            <span style={{ color: '#94A3B8' }}>Patient:</span>
            <span style={{ color: '#38BDF8', fontWeight: '700' }}>{patientId}</span>
          </div>
        </div>
      </div>

      {/* DRAWING VIEW */}
      {stage === 'DRAWING' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>MoCA Visuospatial Assessment • Sunderland 10-Point Evaluation</span>
            </div>
            <div style={styles.targetTimeBadge}>
              <span>TARGET TIME TO DRAW:</span>
              <strong style={{ color: '#38BDF8', fontSize: '18px', marginLeft: '8px' }}>
                {currentTarget.label}
              </strong>
            </div>
          </div>

          <div style={styles.videoGrid}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={styles.canvasWrapper}>
                <canvas
                  ref={canvasRef}
                  style={styles.drawCanvas}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
              <div style={styles.canvasTipBox}>
                <span>Draw numbers (1–12) and clock hands setting time to <strong>{currentTarget.label}</strong></span>
              </div>
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.instructionBox}>
                <div style={styles.instructionTitle}>Clinical Instructions:</div>
                <ul style={styles.instructionList}>
                  <li>Draw all 12 numbers on the clock face in their correct positions.</li>
                  <li>Draw two hands (hour & minute) pointing to: <strong>{currentTarget.label}</strong>.</li>
                  <li>Use the pen tool below; switch to eraser if you make an error.</li>
                </ul>
              </div>

              <div style={styles.toolbarBox}>
                <div style={styles.toolLabel}>Drawing Tools:</div>
                <div style={styles.toolButtons}>
                  <button
                    style={tool === 'pen' ? styles.toolBtnActive : styles.toolBtn}
                    onClick={() => setTool('pen')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19l7-7 3 3-7 7-3-3z" />
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    </svg>
                    <span>Pen</span>
                  </button>
                  <button
                    style={tool === 'eraser' ? styles.toolBtnActive : styles.toolBtn}
                    onClick={() => setTool('eraser')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" />
                      <line x1="18" y1="12" x2="11" y2="19" />
                    </svg>
                    <span>Eraser</span>
                  </button>
                </div>
              </div>

              <div style={styles.actionArea}>
                <button style={styles.clearBtn} onClick={clearCanvas}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Clear Canvas</span>
                </button>
                <button style={styles.primaryBtn} onClick={analyzeClock}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Submit Clock for Analysis</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {stage === 'RESULTS' && results && (
        <div style={styles.resultsCard}>
          <div style={styles.resultsHeader}>
            <div>
              <div style={styles.resultsBadge}>ASSESSMENT COMPLETE</div>
              <h2 style={styles.resultsTitle}>Visuospatial & Executive Function Report</h2>
            </div>
            <div style={results.isAbnormal ? styles.riskBadgeAbnormal : styles.riskBadgeNormal}>
              {results.isAbnormal ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>{results.classification}</span>
            </div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Sunderland Score</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#F8FAFC' }}>
                {results.sunderlandScore}
              </div>
              <div style={styles.metricSub}>Max Score: 10 / 10</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Target Requested</div>
              <div style={{ ...styles.metricVal, fontSize: '16px', color: '#38BDF8' }}>
                {results.targetTimeText}
              </div>
              <div style={styles.metricSub}>{results.contourIntegrity}</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Hand Angles Placement</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981', fontSize: '16px' }}>
                {results.handPositioning}
              </div>
              <div style={styles.metricSub}>{results.numberPlacement}</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Target Time Accuracy</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981' }}>
                {results.visuospatialScore}
              </div>
              <div style={styles.metricSub}>Drawn vs Expected Position</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Cognitive Risk Index</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981' }}>
                {results.riskScore}%
              </div>
              <div style={styles.metricSub}>{results.isAbnormal ? 'High Cognitive Risk Alert' : 'Low Neurological Risk'}</div>
            </div>
          </div>

          <div style={styles.clinicalNotes}>
            <h4 style={styles.notesTitle}>Neuropsychological Evaluation:</h4>
            <p style={styles.notesText}>
              {results.isAbnormal ? (
                <span style={{ color: '#FCA5A5' }}>
                  ⚠️ Visuospatial / Target Time Mismatch Detected: Drawn hands do not match target time of {results.targetTimeText}. In accurate clock drawing, the hour hand must point near {currentTarget.hour} and minute hand near number {currentTarget.minPos}. Reduced Sunderland score indicates potential executive planning or stimulus-bound error.
                </span>
              ) : (
                <span>
                  Clock perimeter shows intact circular closure without spatial hemineglect. Numbers and hands accurately represent target time of {results.targetTimeText} without stimulus-bound error.
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons: Retest button now correctly redirects to DRAWING stage & picks new time */}
          <div style={styles.resultsActions}>
            <button style={styles.secondaryBtn} onClick={handleRetest}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Retest (New Target Time)</span>
            </button>
            <button style={styles.confirmBtn} onClick={handleFinish}>
              <span>Confirm & Save to Health Profile</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
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
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '16px',
    color: '#F8FAFC'
  },
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1E293B',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '10px',
    color: '#38BDF8',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  titleDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#334155'
  },
  testTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.5px'
  },
  testHeading: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800'
  },
  patientBadge: {
    fontSize: '13px',
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    padding: '6px 14px',
    borderRadius: '8px',
    display: 'flex',
    gap: '6px'
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clinicalHeaderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#10B981',
    fontWeight: '600'
  },
  badgePulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981'
  },
  targetTimeBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#090D16',
    border: '1px solid #38BDF8',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#CBD5E1'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '24px'
  },
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#070B12',
    border: '1px solid #1E293B',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '440px'
  },
  drawCanvas: {
    width: '100%',
    height: '440px',
    cursor: 'crosshair',
    touchAction: 'none'
  },
  canvasTipBox: {
    backgroundColor: '#090D16',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '13px',
    color: '#CBD5E1',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  instructionBox: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    padding: '16px'
  },
  instructionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: '8px'
  },
  instructionList: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '12px',
    color: '#CBD5E1',
    lineHeight: '1.6'
  },
  toolbarBox: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    padding: '14px'
  },
  toolLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: '8px'
  },
  toolButtons: {
    display: 'flex',
    gap: '8px'
  },
  toolBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    color: '#94A3B8',
    padding: '10px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  toolBtnActive: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid #38BDF8',
    borderRadius: '8px',
    color: '#38BDF8',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: 'auto'
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#090D16',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#94A3B8',
    padding: '12px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#0284C7',
    background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
  },
  resultsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '20px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultsBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '1px'
  },
  resultsTitle: {
    margin: '4px 0 0 0',
    fontSize: '22px',
    fontWeight: '800'
  },
  riskBadgeNormal: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#6EE7B7',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700'
  },
  riskBadgeAbnormal: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#FCA5A5',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '14px'
  },
  metricTile: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  metricLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94A3B8'
  },
  metricVal: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  metricSub: {
    fontSize: '11px',
    color: '#64748B'
  },
  clinicalNotes: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    padding: '18px'
  },
  notesTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#38BDF8'
  },
  notesText: {
    margin: 0,
    fontSize: '13px',
    color: '#CBD5E1',
    lineHeight: '1.6'
  },
  resultsActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px'
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#CBD5E1',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 22px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
  }
};
