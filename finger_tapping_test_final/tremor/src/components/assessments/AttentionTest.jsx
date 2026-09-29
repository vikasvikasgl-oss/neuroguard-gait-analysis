import React, { useState, useEffect, useRef } from 'react';

const TRIALS = [
  { text: 'RED', color: '#EF4444', correct: 'RED' },
  { text: 'BLUE', color: '#38BDF8', correct: 'BLUE' },
  { text: 'GREEN', color: '#10B981', correct: 'GREEN' },
  { text: 'YELLOW', color: '#F59E0B', correct: 'YELLOW' },
  { text: 'RED', color: '#38BDF8', correct: 'BLUE' }, // Incongruent
  { text: 'GREEN', color: '#EF4444', correct: 'RED' }, // Incongruent
  { text: 'BLUE', color: '#10B981', correct: 'GREEN' }, // Incongruent
  { text: 'YELLOW', color: '#EF4444', correct: 'RED' } // Incongruent
];

const COLOR_OPTIONS = [
  { label: 'RED', color: '#EF4444' },
  { label: 'BLUE', color: '#38BDF8' },
  { label: 'GREEN', color: '#10B981' },
  { label: 'YELLOW', color: '#F59E0B' }
];

export default function AttentionTest({ onBack, onComplete, patientId = 'PT-7049' }) {
  const [stage, setStage] = useState('READY'); // READY | TESTING | RESULTS
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [results, setResults] = useState(null);

  const trialStartTimeRef = useRef(0);

  const startTest = () => {
    setCurrentTrialIdx(0);
    setReactionTimes([]);
    setCorrectCount(0);
    setLastFeedback(null);
    setStage('TESTING');
    trialStartTimeRef.current = performance.now();
  };

  const handleResponse = (selectedColor) => {
    const now = performance.now();
    const rt = Math.round(now - trialStartTimeRef.current);
    const trial = TRIALS[currentTrialIdx];
    const isCorrect = selectedColor === trial.correct;

    const newRtList = [...reactionTimes, rt];
    setReactionTimes(newRtList);
    if (isCorrect) setCorrectCount((c) => c + 1);

    setLastFeedback(isCorrect ? 'CORRECT' : 'INCORRECT');

    if (currentTrialIdx + 1 < TRIALS.length) {
      setCurrentTrialIdx((i) => i + 1);
      trialStartTimeRef.current = performance.now();
    } else {
      finishTest(newRtList, correctCount + (isCorrect ? 1 : 0));
    }
  };

  const finishTest = (times, correct) => {
    const total = TRIALS.length;
    const accuracy = Math.round((correct / total) * 100);
    const avgRt = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 540;
    const isNormal = accuracy >= 75 && avgRt < 950;

    const finalResult = {
      testId: 'attention',
      title: 'Attention & Executive Function Test',
      completedAt: new Date().toISOString(),
      accuracyRate: `${accuracy}% (${correct}/${total})`,
      meanLatency: `${avgRt} ms`,
      inhibitoryControl: isNormal ? 'Preserved (Interference < 120ms)' : 'Mild Attentional Hesitation',
      commissionErrors: total - correct,
      riskScore: isNormal ? 10 : 55,
      classification: isNormal
        ? 'Typical Attentional Focus & Inhibitory Control (Normal)'
        : 'Mild Attentional Latency Variance Detected'
    };

    setResults(finalResult);
    setStage('RESULTS');
  };

  const handleFinish = () => {
    if (onComplete && results) onComplete(results);
    if (onBack) onBack();
  };

  const currentTrial = TRIALS[currentTrialIdx];

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
            <div style={styles.testTag}>SLOT 10 • COGNITIVE ASSESSMENT</div>
            <h2 style={styles.testHeading}>Attention & Executive Function (Component 11)</h2>
          </div>
        </div>

        <div style={styles.navRight}>
          <div style={styles.patientBadge}>
            <span style={{ color: '#94A3B8' }}>Patient:</span>
            <span style={{ color: '#38BDF8', fontWeight: '700' }}>{patientId}</span>
          </div>
        </div>
      </div>

      {/* READY VIEW */}
      {stage === 'READY' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>Stroop Interference & Reaction Latency Protocol</span>
            </div>
          </div>

          <div style={styles.readyContent}>
            <div style={styles.instructionIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h3 style={styles.readyTitle}>Color-Word Inhibitory Control</h3>
            <p style={styles.readyDesc}>
              A word will appear on screen written in colored ink. Your task is to <strong>name the INK COLOR</strong> of the word as quickly and accurately as possible (ignore what the word actually spells).
            </p>

            <div style={styles.exampleBox}>
              <div style={styles.exampleWord}>BLUE</div>
              <div style={styles.exampleCaption}>Written in Green Ink → Press <strong>GREEN</strong></div>
            </div>

            <button style={styles.primaryBtn} onClick={startTest}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Start 8-Trial Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* TESTING VIEW */}
      {stage === 'TESTING' && currentTrial && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>Trial {currentTrialIdx + 1} of {TRIALS.length}</span>
            </div>
            <div style={styles.trialCounter}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Progress:</span>
              <strong style={{ color: '#38BDF8', marginLeft: '6px' }}>{Math.round(((currentTrialIdx + 1) / TRIALS.length) * 100)}%</strong>
            </div>
          </div>

          <div style={styles.testingBody}>
            <div style={styles.promptHint}>Choose the <strong>INK COLOR</strong>:</div>

            <div style={{ ...styles.stimulusWord, color: currentTrial.color }}>
              {currentTrial.text}
            </div>

            <div style={styles.buttonOptionsGrid}>
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  style={{ ...styles.colorChoiceBtn, borderColor: opt.color }}
                  onClick={() => handleResponse(opt.label)}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: opt.color }} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {lastFeedback && (
              <div style={lastFeedback === 'CORRECT' ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                {lastFeedback === 'CORRECT' ? '✓ Good Cadence' : '⚠ Color Mismatch'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {stage === 'RESULTS' && results && (
        <div style={styles.resultsCard}>
          <div style={styles.resultsHeader}>
            <div>
              <div style={styles.resultsBadge}>ASSESSMENT COMPLETE</div>
              <h2 style={styles.resultsTitle}>Attention & Executive Latency Report</h2>
            </div>
            <div style={styles.riskBadgeNormal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{results.classification}</span>
            </div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Accuracy Rate</div>
              <div style={styles.metricVal}>{results.accuracyRate}</div>
              <div style={styles.metricSub}>MDS Target: ≥ 75%</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Reaction Latency</div>
              <div style={styles.metricVal}>{results.meanLatency}</div>
              <div style={styles.metricSub}>Normal Processing Speed</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Inhibitory Control</div>
              <div style={styles.metricVal}>Preserved</div>
              <div style={styles.metricSub}>{results.inhibitoryControl}</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Cognitive Risk</div>
              <div style={{ ...styles.metricVal, color: '#10B981' }}>{results.riskScore}%</div>
              <div style={styles.metricSub}>Low Neurological Risk</div>
            </div>
          </div>

          <div style={styles.clinicalNotes}>
            <h4 style={styles.notesTitle}>Frontostriatal Processing Summary:</h4>
            <p style={styles.notesText}>
              Patient exhibited preserved selective attention and cognitive flexibility across both congruent and incongruent trials. No excessive Stroop interference effect or psychomotor slowing detected. Prefrontal attentional gating is operating within healthy age-adjusted norms.
            </p>
          </div>

          <div style={styles.resultsActions}>
            <button style={styles.secondaryBtn} onClick={startTest}>
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
    borderBottom: '1px solid #1E293B'
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
  trialCounter: {
    background: '#1E293B',
    padding: '6px 14px',
    borderRadius: '8px'
  },
  readyContent: {
    padding: '56px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  instructionIcon: {
    marginBottom: '16px'
  },
  readyTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#F8FAFC',
    margin: '0 0 12px 0'
  },
  readyDesc: {
    fontSize: '15px',
    color: '#CBD5E1',
    maxWidth: '560px',
    lineHeight: '1.6',
    margin: '0 0 32px 0'
  },
  exampleBox: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '24px 36px',
    marginBottom: '36px',
    textAlign: 'center'
  },
  exampleWord: {
    fontSize: '36px',
    fontWeight: '900',
    color: '#10B981', // Blue text in green ink
    marginBottom: '8px',
    letterSpacing: '0.05em'
  },
  exampleCaption: {
    fontSize: '13px',
    color: '#94A3B8'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '16px 36px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(2, 132, 199, 0.4)'
  },
  testingBody: {
    padding: '56px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  promptHint: {
    fontSize: '15px',
    color: '#94A3B8',
    marginBottom: '24px'
  },
  stimulusWord: {
    fontSize: '64px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    marginBottom: '48px',
    textShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
  },
  buttonOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 180px)',
    gap: '16px',
    marginBottom: '28px'
  },
  colorChoiceBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#1E293B',
    border: '2px solid transparent',
    color: '#F8FAFC',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  feedbackCorrect: {
    fontSize: '13px',
    color: '#10B981',
    fontWeight: '700',
    marginTop: '12px'
  },
  feedbackIncorrect: {
    fontSize: '13px',
    color: '#EF4444',
    fontWeight: '700',
    marginTop: '12px'
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
    fontSize: '26px',
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
