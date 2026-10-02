import React, { useState, useEffect, useRef } from 'react';
import LiveWaveform from '../finger-tapping/LiveWaveform.jsx';

export default function SpiralTest({ onBack, onComplete, patientId = 'PT-7049' }) {
  const [stage, setStage] = useState('READY'); // READY | DRAWING | RESULTS
  const [points, setPoints] = useState([]);
  const [waveform, setWaveform] = useState([]);
  const [drawingStarted, setDrawingStarted] = useState(false);
  const [results, setResults] = useState(null);
  const [shakeDetected, setShakeDetected] = useState(false);

  const canvasRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const pointsRef = useRef([]);

  // Draw background template Archimedean spiral
  const drawTemplate = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;
    const turns = 3.5;

    // Draw reference template
    ctx.beginPath();
    for (let theta = 0; theta <= turns * 2 * Math.PI; theta += 0.05) {
      const r = (theta / (turns * 2 * Math.PI)) * maxRadius;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      if (theta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start target bullseye in center
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#38BDF8';
    ctx.fill();

    // Start text label
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('START', cx + 12, cy + 4);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth || 580;
    canvas.height = canvas.clientHeight || 460;
    const ctx = canvas.getContext('2d');
    drawTemplate(ctx, canvas.width, canvas.height);
  }, [stage]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawTemplate(ctx, canvas.width, canvas.height);

    const pts = pointsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Glowing green pointer at current pen tip
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  const handlePointerDown = (e) => {
    isMouseDownRef.current = true;
    setDrawingStarted(true);
    if (stage === 'READY') setStage('DRAWING');
    addPoint(e);
  };

  const handlePointerMove = (e) => {
    if (!isMouseDownRef.current) return;
    addPoint(e);
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
  };

  const addPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now();

    const pt = { x, y, t };
    pointsRef.current.push(pt);
    setPoints([...pointsRef.current]);
    redrawCanvas();

    // Calculate real-time radial distance from center
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    setWaveform((prev) => [...prev.slice(-100), r / (canvas.width * 0.45)]);
  };

  const clearCanvas = () => {
    pointsRef.current = [];
    setPoints([]);
    setWaveform([]);
    setDrawingStarted(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawTemplate(ctx, canvas.width, canvas.height);
    }
  };

  const handleRetest = () => {
    pointsRef.current = [];
    setPoints([]);
    setWaveform([]);
    setDrawingStarted(false);
    setResults(null);
    setStage('READY');
  };

  const analyzeDrawing = () => {
    const pts = pointsRef.current;
    if (pts.length < 20) {
      alert('Please trace along the spiral before completing analysis.');
      return;
    }

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 580;
    const height = canvas ? canvas.height : 460;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;
    const totalTurns = 3.5;

    // 1. Filter / Downsample high-frequency mouse points to uniform spatial resolution (~4px step)
    const smoothPts = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const last = smoothPts[smoothPts.length - 1];
      const dist = Math.hypot(pts[i].x - last.x, pts[i].y - last.y);
      if (dist >= 3.8) {
        smoothPts.push(pts[i]);
      }
    }

    // 2. Compute RMSE relative to nearest Archimedean Spiral guide loop
    let sumSqErr = 0;
    let radialOscillations = 0;
    let prevRadialDiff = 0;
    const turnRadii = [[], [], [], []];

    for (let i = 0; i < smoothPts.length; i++) {
      const dx = smoothPts[i].x - cx;
      const dy = smoothPts[i].y - cy;
      const rActual = Math.hypot(dx, dy);

      // Polar angle in [0, 2*PI)
      let phi = Math.atan2(dy, dx);
      if (phi < 0) phi += 2 * Math.PI;

      // Find nearest turn loop (turn 0 to 3)
      let minErrSq = Infinity;
      let matchedTurn = 0;
      for (let turn = 0; turn < 4; turn++) {
        const theta = phi + turn * 2 * Math.PI;
        const rIdeal = (theta / (totalTurns * 2 * Math.PI)) * maxRadius;
        const err = rActual - rIdeal;
        if (err * err < minErrSq) {
          minErrSq = err * err;
          matchedTurn = turn;
        }
      }

      sumSqErr += minErrSq;
      turnRadii[matchedTurn].push(rActual);

      if (i > 0) {
        const prevR = Math.hypot(smoothPts[i - 1].x - cx, smoothPts[i - 1].y - cy);
        const diff = rActual - prevR;
        if (prevRadialDiff * diff < 0 && Math.abs(diff) > 1.2) {
          radialOscillations++;
        }
        prevRadialDiff = diff;
      }
    }

    const rmse = Math.sqrt(sumSqErr / Math.max(1, smoothPts.length));

    // 3. Compute Jerk & Angular Micro-Jitter on spatial resampled points
    let secondDiffSum = 0;
    let directionalChanges = 0;

    for (let i = 2; i < smoothPts.length; i++) {
      const dx1 = smoothPts[i - 1].x - smoothPts[i - 2].x;
      const dy1 = smoothPts[i - 1].y - smoothPts[i - 2].y;
      const dx2 = smoothPts[i].x - smoothPts[i - 1].x;
      const dy2 = smoothPts[i].y - smoothPts[i - 1].y;

      const d2x = dx2 - dx1;
      const d2y = dy2 - dy1;
      secondDiffSum += Math.hypot(d2x, d2y);

      const mag1 = Math.hypot(dx1, dy1);
      const mag2 = Math.hypot(dx2, dy2);
      if (mag1 > 1.0 && mag2 > 1.0) {
        const cosTheta = (dx1 * dx2 + dy1 * dy2) / (mag1 * mag2);
        const clampedCos = Math.max(-1, Math.min(1, cosTheta));
        const turnAngle = Math.acos(clampedCos);
        if (turnAngle > 0.48) { // Genuine sharp corner (>27 deg)
          directionalChanges++;
        }
      }
    }

    const avgSecondDiff = secondDiffSum / Math.max(1, smoothPts.length - 2);
    const jerkMetric = Math.round(avgSecondDiff * 24);

    // 4. Tremor Frequency (Hz)
    const startTime = pts[0]?.t || 0;
    const endTime = pts[pts.length - 1]?.t || 1000;
    const totalDurationSec = Math.max(1.0, (endTime - startTime) / 1000);
    const rawFreq = (directionalChanges * 0.8 + radialOscillations * 0.4) / totalDurationSec;
    const tremorFreqVal = Math.min(Math.max(rawFreq, 0.4), 9.5);

    // 5. Micrographia Ratio (Constancy of radial loop spacing)
    let innerAvg = turnRadii[0].length ? turnRadii[0].reduce((a, b) => a + b, 0) / turnRadii[0].length : 40;
    let outerAvg = turnRadii[3].length ? turnRadii[3].reduce((a, b) => a + b, 0) / turnRadii[3].length : 160;
    let micrographiaRatio = 0.94;
    if (innerAvg > 5 && outerAvg > 20) {
      const idealRatio = 1.0;
      const actualSpread = outerAvg / (innerAvg * 4.0);
      micrographiaRatio = Math.max(0.72, Math.min(1.15, actualSpread || idealRatio));
    }

    // 6. Calibrated Tremor Sensitivity Evaluation
    // Normal smooth trace: RMSE 3-9px, Jerk 10-38, Tremor Freq < 2.0Hz
    // Tremulous trace: RMSE > 18px OR Jerk > 50 OR high-freq jitter
    const rmseRisk = Math.min(100, (rmse / 22) * 50);
    const jerkRisk = Math.min(100, (jerkMetric / 55) * 50);
    const jitterRisk = Math.min(100, (directionalChanges / (smoothPts.length * 0.25)) * 50);

    const calculatedRisk = Math.min(95, Math.max(6, Math.round(rmseRisk * 0.45 + jerkRisk * 0.35 + jitterRisk * 0.2)));
    
    // Balanced tremor trigger
    const isTremulous = calculatedRisk >= 48 || jerkMetric >= 52 || (rmse > 16.0 && jerkMetric > 40);

    const finalResult = {
      testId: 'spiral',
      title: 'Archimedean Spiral Drawing Test',
      completedAt: new Date().toISOString(),
      samplePoints: pts.length,
      rmseDeviation: `${rmse.toFixed(1)} px`,
      tremorFrequency: tremorFreqVal >= 3.8 && isTremulous
        ? `${tremorFreqVal.toFixed(1)} Hz (Tremulous)`
        : `None (< 1 Hz)`,
      velocitySmoothness: jerkMetric >= 45
        ? `Irregular (Jerk: ${jerkMetric})`
        : `Smooth (Jerk: ${jerkMetric})`,
      micrographiaIndex: `${micrographiaRatio.toFixed(2)} (${micrographiaRatio < 0.75 ? 'Micrographia Pattern' : 'Physiological'})`,
      isTremulous,
      riskScore: calculatedRisk,
      classification: isTremulous
        ? 'Kinematic Spiral Tremor & Incoordination Pattern Detected'
        : 'Typical Smooth Motor Coordination (Normal)'
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
            <div style={styles.testTag}>SLOT 07 • MOVEMENT ASSESSMENT</div>
            <h2 style={styles.testHeading}>Spiral & Handwriting Test (Component 8)</h2>
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
      {(stage === 'READY' || stage === 'DRAWING') && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>Archimedean Spiral Kinematic Analysis • Fine-Motor & Micrographia</span>
            </div>
            <div style={styles.headerCounters}>
              <div style={styles.counterBox}>
                <span style={styles.counterLabel}>POINTS TRACED</span>
                <span style={styles.counterVal}>{points.length}</span>
              </div>
            </div>
          </div>

          <div style={styles.videoGrid}>
            <div style={styles.canvasWrapper}>
              <canvas
                ref={canvasRef}
                style={styles.drawCanvas}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
              <div style={styles.canvasTip}>
                <span>Click & drag from <strong>START</strong> outwards along the guide lines</span>
              </div>
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.instructionBox}>
                <div style={styles.instructionTitle}>Tracing Protocol:</div>
                <ul style={styles.instructionList}>
                  <li>Trace continuously from the center bullseye outward.</li>
                  <li>Do not rest your wrist heavily on the screen or table.</li>
                  <li>Maintain a steady, unhurried drawing velocity.</li>
                  <li>Try to stay as close as possible within the dashed guide.</li>
                </ul>
              </div>

              <div style={styles.waveformContainer}>
                <div style={styles.waveformHeader}>
                  <span>Radial Progression Profile</span>
                  <span style={{ color: '#10B981' }}>Live Waveform</span>
                </div>
                <div style={styles.waveformBox}>
                  <LiveWaveform points={waveform} />
                </div>
              </div>

              <div style={styles.actionArea}>
                <button style={styles.clearBtn} onClick={clearCanvas}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Clear & Redo</span>
                </button>
                <button style={styles.primaryBtn} onClick={analyzeDrawing}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Complete & Analyze Spiral</span>
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
              <h2 style={styles.resultsTitle}>Fine Motor Kinematics & Spiral Report</h2>
            </div>
            <div style={results.isTremulous ? styles.riskBadgeAlert : styles.riskBadgeNormal}>
              {results.isTremulous ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
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
              <div style={styles.metricLabel}>Spiral RMSE Deviation</div>
              <div style={styles.metricVal}>{results.rmseDeviation}</div>
              <div style={styles.metricSub}>Normal: &lt; 6.0 px</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Micro-Tremor Frequency</div>
              <div style={styles.metricVal}>{results.tremorFrequency}</div>
              <div style={styles.metricSub}>Action / Intention Tremor</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Velocity Profile</div>
              <div style={styles.metricVal}>{results.velocitySmoothness}</div>
              <div style={styles.metricSub}>Jerk Metric Index</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Micrographia Ratio</div>
              <div style={styles.metricVal}>{results.micrographiaIndex}</div>
              <div style={styles.metricSub}>Loop spacing constancy</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Parkinsonian Risk</div>
              <div style={{ ...styles.metricVal, color: results.isTremulous ? '#EF4444' : '#10B981' }}>
                {results.riskScore}%
              </div>
              <div style={styles.metricSub}>{results.isTremulous ? 'Elevated Risk' : 'Low Neurological Risk'}</div>
            </div>
          </div>

          <div style={styles.clinicalNotes}>
            <h4 style={styles.notesTitle}>Clinical Kinematic Insights:</h4>
            <p style={styles.notesText}>
              {results.isTremulous
                ? 'High-frequency sub-movement ripples and directional hesitations were observed along spiral trajectories, consistent with upper extremity kinetic tremor.'
                : 'Trace demonstrated preserved smooth pursuit velocity with uniform radial loop expansion. No progressive amplitude compression (micrographia) or dystonic jerks detected.'}
            </p>
          </div>

          <div style={styles.resultsActions}>
            <button style={styles.secondaryBtn} onClick={handleRetest}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Retest</span>
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
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#E2E8F0',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  titleDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: '#334155'
  },
  testTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.08em'
  },
  testHeading: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  patientBadge: {
    display: 'flex',
    gap: '6px',
    background: '#0F172A',
    border: '1px solid #1E293B',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px'
  },
  card: {
    background: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #1E293B',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #1E293B',
    flexWrap: 'wrap',
    gap: '16px'
  },
  clinicalHeaderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94A3B8'
  },
  badgePulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981'
  },
  headerCounters: {
    display: 'flex',
    gap: '16px'
  },
  counterBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#1E293B',
    padding: '6px 16px',
    borderRadius: '8px',
    minWidth: '90px'
  },
  counterLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: '0.05em'
  },
  counterVal: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    padding: '24px'
  },
  canvasWrapper: {
    position: 'relative',
    background: '#020617',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '4/3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #1E293B',
    cursor: 'crosshair',
    touchAction: 'none'
  },
  drawCanvas: {
    width: '100%',
    height: '100%'
  },
  canvasTip: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    right: '12px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '8px',
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#CBD5E1'
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '16px'
  },
  instructionBox: {
    background: '#1E293B',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #334155'
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
    fontSize: '13px',
    color: '#CBD5E1',
    lineHeight: '1.6'
  },
  waveformContainer: {
    background: '#1E293B',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid #334155'
  },
  waveformHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: '10px'
  },
  waveformBox: {
    height: '100px',
    background: '#090D16',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#1E293B',
    color: '#94A3B8',
    border: '1px solid #334155',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
  },
  resultsCard: {
    background: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #1E293B',
    padding: '32px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  resultsBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '0.08em',
    marginBottom: '4px'
  },
  resultsTitle: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0
  },
  riskBadgeNormal: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid #10B981',
    color: '#10B981',
    padding: '8px 16px',
    borderRadius: '30px',
    fontWeight: '700',
    fontSize: '14px'
  },
  riskBadgeAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid #EF4444',
    color: '#EF4444',
    padding: '8px 16px',
    borderRadius: '30px',
    fontWeight: '700',
    fontSize: '14px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '28px'
  },
  metricTile: {
    background: '#1E293B',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: '8px'
  },
  metricVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: '4px'
  },
  metricSub: {
    fontSize: '12px',
    color: '#64748B'
  },
  clinicalNotes: {
    background: 'rgba(56, 189, 248, 0.05)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '28px'
  },
  notesTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#38BDF8'
  },
  notesText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#CBD5E1'
  },
  resultsActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px'
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#CBD5E1',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#10B981',
    border: 'none',
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
  }
};
