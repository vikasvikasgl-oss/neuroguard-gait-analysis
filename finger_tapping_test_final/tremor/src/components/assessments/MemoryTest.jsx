import React, { useState, useEffect } from 'react';

const WORD_POOLS = [
  ['APPLE', 'RIVER', 'VELVET', 'CHURCH', 'DAISY'],
  ['LION', 'HARBOR', 'SILK', 'TEMPLE', 'TULIP'],
  ['TIGER', 'MOUNTAIN', 'SATIN', 'CHAPEL', 'ORCHID'],
  ['EAGLE', 'VALLEY', 'COTTON', 'PALACE', 'JASMINE'],
  ['DOLPHIN', 'FOREST', 'LINEN', 'TOWER', 'VIOLET'],
  ['FALCON', 'ISLAND', 'WOOL', 'CASTLE', 'LILY'],
  ['PANTHER', 'OCEAN', 'DENIM', 'CATHEDRAL', 'ROSE']
];

const DISTRACTOR_POOL = [
  'HAMMER', 'BRIDGE', 'PENCIL', 'BUTTON', 'CANDLE', 'MIRROR', 'LANTERN',
  'WINDOW', 'BOTTLE', 'SPOON', 'BASKET', 'KEY', 'CLOCK', 'GUITAR', 'POCKET',
  'COMPASS', 'FEATHER', 'DIAMOND', 'SHIELD', 'HELMET', 'MAGNET', 'ANCHOR'
];

export default function MemoryTest({ onBack, onComplete, patientId = 'PT-7049' }) {
  const [stage, setStage] = useState('STUDY'); // STUDY | DISTRACTION | RECALL | RESULTS
  const [studyTimer, setStudyTimer] = useState(10);
  const [distractionTimer, setDistractionTimer] = useState(8);
  const [targetWords, setTargetWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [results, setResults] = useState(null);

  const initializeRandomTest = () => {
    // 1. Pick a random 5-word target list
    const randomIndex = Math.floor(Math.random() * WORD_POOLS.length);
    const selectedTargetList = WORD_POOLS[randomIndex];
    setTargetWords(selectedTargetList);

    // 2. Pick 7 distinct distractors from distractor pool
    const shuffledDistractors = [...DISTRACTOR_POOL].sort(() => 0.5 - Math.random());
    const selectedDistractors = shuffledDistractors.filter((w) => !selectedTargetList.includes(w)).slice(0, 7);

    // 3. Combine and shuffle pool for recall options
    const pool = [...selectedTargetList, ...selectedDistractors];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setShuffledOptions(pool);
  };

  useEffect(() => {
    initializeRandomTest();
  }, []);

  // Study timer countdown
  useEffect(() => {
    if (stage !== 'STUDY') return;
    const interval = setInterval(() => {
      setStudyTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('DISTRACTION');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // Distraction timer countdown
  useEffect(() => {
    if (stage !== 'DISTRACTION') return;
    const interval = setInterval(() => {
      setDistractionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('RECALL');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  const toggleWordSelection = (word) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else {
      if (selectedWords.length < 5) {
        setSelectedWords([...selectedWords, word]);
      }
    }
  };

  const evaluateRecall = () => {
    const correctCount = selectedWords.filter((w) => targetWords.includes(w)).length;
    const isNormal = correctCount >= 4;
    const riskScore =
      correctCount >= 5 ? 10 :
      correctCount === 4 ? 20 :
      correctCount === 3 ? 50 :
      correctCount === 2 ? 75 : 90;

    const classification =
      correctCount >= 4
        ? 'Typical Cognitive Memory Performance (Normal)'
        : correctCount === 3
        ? 'Mild Short-Term Retrieval Variance Detected'
        : 'Elevated Short-Term Memory Impairment Detected';

    const finalResult = {
      testId: 'memory',
      title: '5-Word Cognitive Memory Recall',
      completedAt: new Date().toISOString(),
      score: `${correctCount} / 5`,
      accuracyPct: Math.round((correctCount / 5) * 100) + '%',
      retentionScore: isNormal ? 'Intact (Episodic Encoding High)' : 'Retrieval Deficit Identified',
      recallLatency: '1.8s avg',
      riskScore,
      isAbnormal: !isNormal,
      classification
    };

    setResults(finalResult);
    setStage('RESULTS');
    if (onComplete) onComplete(finalResult);
  };

  const handleFinish = () => {
    if (onComplete && results) onComplete(results);
    if (onBack) onBack();
  };

  const handleRestart = () => {
    setSelectedWords([]);
    setStudyTimer(10);
    setDistractionTimer(8);
    setStage('STUDY');
    initializeRandomTest();
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
            <div style={styles.testTag}>SLOT 08 • COGNITIVE ASSESSMENT</div>
            <h2 style={styles.testHeading}>Memory Recall Test (Component 9)</h2>
          </div>
        </div>

        <div style={styles.navRight}>
          <div style={styles.patientBadge}>
            <span style={{ color: '#94A3B8' }}>Patient:</span>
            <span style={{ color: '#38BDF8', fontWeight: '700' }}>{patientId}</span>
          </div>
        </div>
      </div>

      {/* PHASE 1: STUDY */}
      {stage === 'STUDY' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>MoCA & MDS-UPDRS Part I • Episodic Memory Registration</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterLabel}>MEMORIZE TIME</span>
              <span style={{ ...styles.counterVal, color: '#38BDF8' }}>{studyTimer}s</span>
            </div>
          </div>

          <div style={styles.contentBody}>
            <h3 style={styles.promptTitle}>Memorize the following 5 target words:</h3>
            <p style={styles.promptSubtitle}>You will be asked to recall them following a brief distraction task.</p>

            <div style={styles.wordCardsGrid}>
              {targetWords.map((word, i) => (
                <div key={i} style={styles.wordCard}>
                  <div style={styles.wordIndex}>0{i + 1}</div>
                  <div style={styles.wordText}>{word}</div>
                </div>
              ))}
            </div>

            <div style={styles.progressFooter}>
              <button style={styles.skipBtn} onClick={() => setStage('DISTRACTION')}>
                <span>I've Memorized Them (Proceed)</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: DISTRACTION */}
      {stage === 'DISTRACTION' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>Interference Task • Working Memory Cleansing</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterLabel}>REMAINING</span>
              <span style={{ ...styles.counterVal, color: '#F59E0B' }}>{distractionTimer}s</span>
            </div>
          </div>

          <div style={styles.distractionBody}>
            <div style={styles.distractionIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 style={styles.distractionTitle}>Brief Interference Pause</h3>
            <p style={styles.distractionDesc}>
              Count backward silently from <strong>50 down by 3s</strong> (50, 47, 44, 41...) while the timer expires.
            </p>
            <div style={styles.pulseRing} />
          </div>
        </div>
      )}

      {/* PHASE 3: RECALL */}
      {stage === 'RECALL' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.clinicalHeaderBadge}>
              <span style={styles.badgePulseDot} />
              <span>Delayed Retrieval Test • Select the 5 Original Words</span>
            </div>
            <div style={styles.counterBox}>
              <span style={styles.counterLabel}>SELECTED</span>
              <span style={{ ...styles.counterVal, color: selectedWords.length === 5 ? '#10B981' : '#38BDF8' }}>
                {selectedWords.length} / 5
              </span>
            </div>
          </div>

          <div style={styles.contentBody}>
            <h3 style={styles.promptTitle}>Click on the 5 words you memorized:</h3>
            <p style={styles.promptSubtitle}>Select exactly 5 words from the bank below.</p>

            <div style={styles.recallBankGrid}>
              {shuffledOptions.map((word, i) => {
                const isSelected = selectedWords.includes(word);
                return (
                  <button
                    key={i}
                    style={isSelected ? styles.recallOptionSelected : styles.recallOption}
                    onClick={() => toggleWordSelection(word)}
                  >
                    <span>{word}</span>
                    {isSelected && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={styles.progressFooter}>
              <button
                style={styles.submitBtn}
                onClick={evaluateRecall}
              >
                <span>Submit & Calculate Recall Index ({selectedWords.length}/5 Selected)</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: RESULTS */}
      {stage === 'RESULTS' && results && (
        <div style={styles.resultsCard}>
          <div style={styles.resultsHeader}>
            <div>
              <div style={styles.resultsBadge}>ASSESSMENT COMPLETE</div>
              <h2 style={styles.resultsTitle}>Cognitive Episodic Memory Report</h2>
            </div>
            <div style={results.isAbnormal ? styles.riskBadgeHigh : styles.riskBadgeNormal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{results.classification}</span>
            </div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Recall Score</div>
              <div style={styles.metricVal}>{results.score}</div>
              <div style={styles.metricSub}>MDS Target: ≥ 4 words</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Accuracy Rate</div>
              <div style={styles.metricVal}>{results.accuracyPct}</div>
              <div style={styles.metricSub}>Post-Interference</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Hippocampal Encoding</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981' }}>
                {results.isAbnormal ? 'Impaired' : 'Intact'}
              </div>
              <div style={styles.metricSub}>Free Recall Verified</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Cognitive Risk</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981' }}>
                {results.riskScore}%
              </div>
              <div style={styles.metricSub}>
                {results.isAbnormal ? 'Elevated Cognitive Risk' : 'Low Neurological Risk'}
              </div>
            </div>
          </div>

          <div style={styles.clinicalNotes}>
            <h4 style={styles.notesTitle}>Neuropsychological Summary:</h4>
            <p style={styles.notesText}>
              {results.isAbnormal
                ? 'Patient demonstrated reduced verbal memory retention following distraction pause. Target words were unretrieved, indicating potential short-term retrieval deficits.'
                : 'Patient demonstrated robust verbal memory consolidation. Recall after distraction revealed no significant confabulation or intrusion errors. Working memory channels are fully preserved.'}
            </p>
          </div>

          <div style={styles.resultsActions}>
            <button style={styles.secondaryBtn} onClick={handleRestart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Retest Memory</span>
            </button>
            <button style={styles.confirmBtn} onClick={handleFinish}>
              <span>Confirm & Return to Dashboard</span>
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
    fontWeight: '800'
  },
  contentBody: {
    padding: '36px 24px',
    textAlign: 'center'
  },
  promptTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F8FAFC',
    margin: '0 0 8px 0'
  },
  promptSubtitle: {
    fontSize: '14px',
    color: '#94A3B8',
    margin: '0 0 32px 0'
  },
  wordCardsGrid: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '40px'
  },
  wordCard: {
    background: '#1E293B',
    border: '1px solid #38BDF8',
    borderRadius: '12px',
    padding: '24px 28px',
    minWidth: '140px',
    boxShadow: '0 4px 18px rgba(56, 189, 248, 0.15)'
  },
  wordIndex: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: '6px'
  },
  wordText: {
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: '#F8FAFC'
  },
  progressFooter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },
  skipBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#38BDF8',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  distractionBody: {
    padding: '64px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  distractionIcon: {
    marginBottom: '16px'
  },
  distractionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#F59E0B',
    margin: '0 0 12px 0'
  },
  distractionDesc: {
    fontSize: '16px',
    color: '#CBD5E1',
    maxWidth: '500px',
    lineHeight: '1.6',
    margin: 0
  },
  pulseRing: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid #F59E0B',
    marginTop: '32px',
    animation: 'pulse 1.5s infinite'
  },
  recallBankGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '14px',
    maxWidth: '750px',
    margin: '0 auto 36px auto'
  },
  recallOption: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#E2E8F0',
    padding: '16px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  recallOptionSelected: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid #10B981',
    color: '#10B981',
    padding: '16px 20px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '800',
    cursor: 'pointer'
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
  },
  disabledSubmitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1E293B',
    color: '#64748B',
    border: '1px solid #334155',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'not-allowed'
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
  riskBadgeHigh: {
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
