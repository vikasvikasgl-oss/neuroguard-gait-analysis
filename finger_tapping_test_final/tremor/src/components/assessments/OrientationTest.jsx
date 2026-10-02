import React, { useState } from 'react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function OrientationTest({ onBack, onComplete, patientId = 'PT-7049' }) {
  const [stage, setStage] = useState('TEST'); // TEST | RESULTS

  // Current system date for comparison
  const now = new Date();
  const actualDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const actualMonthName = now.toLocaleDateString('en-US', { month: 'long' });
  const actualDateNum = now.getDate();
  const actualYearNum = now.getFullYear();

  // User responses
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [inputDate, setInputDate] = useState('');
  const [inputYear, setInputYear] = useState('');

  const [results, setResults] = useState(null);

  const handleSubmitTest = () => {
    // 1. Day Accuracy
    const isDayCorrect = selectedDay.toLowerCase() === actualDayName.toLowerCase();
    
    // 2. Month & Year Accuracy
    const isMonthCorrect = selectedMonth.toLowerCase() === actualMonthName.toLowerCase();
    const isYearCorrect = parseInt(inputYear, 10) === actualYearNum;
    const monthYearScore = (isMonthCorrect ? 50 : 0) + (isYearCorrect ? 50 : 0);

    // 3. Date Num Accuracy
    const parsedDate = parseInt(inputDate, 10);
    const dateDiff = Math.abs(parsedDate - actualDateNum);
    const dateScore = isNaN(parsedDate) ? 0 : dateDiff === 0 ? 100 : dateDiff <= 2 ? 60 : 0;

    // Total Composite Score across 3 temporal factors
    const totalScorePct = Math.round(
      ((isDayCorrect ? 100 : 0) + monthYearScore + dateScore) / 3
    );

    const isNormal = totalScorePct >= 70;
    const classification = isNormal
      ? 'Intact Temporal Orientation (Normal)'
      : 'Mild Temporal Disorientation Detected';

    const riskScore = Math.max(5, 100 - totalScorePct);

    const testResults = {
      testId: 'orientation',
      title: 'Temporal Orientation Assessment',
      completedAt: new Date().toISOString(),
      score: `${totalScorePct}%`,
      dayAccuracy: isDayCorrect ? '100% (Exact)' : 'Incorrect',
      monthYearAccuracy: `${monthYearScore}%`,
      dateAccuracy: `${dateScore}%`,
      totalScorePct,
      riskScore,
      classification,
      isAbnormal: !isNormal
    };

    setResults(testResults);
    setStage('RESULTS');
    onComplete?.(testResults);
  };

  const handleRestart = () => {
    setStage('TEST');
    setSelectedDay('');
    setSelectedMonth('');
    setInputDate('');
    setInputYear('');
    setResults(null);
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
        <div style={styles.headerInfo}>
          <span style={styles.patientBadge}>ID: {patientId}</span>
          <span style={styles.testBadge}>COGNITIVE • TEST 08</span>
        </div>
      </div>

      {stage === 'TEST' && (
        <div style={styles.mainCard}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h2 style={styles.title}>Temporal Orientation Assessment</h2>
              <p style={styles.subtitle}>
                Screening for calendar alignment, day of the week, date, and temporal awareness.
              </p>
            </div>
          </div>

          {/* TEMPORAL ORIENTATION QUESTIONS */}
          <div style={styles.stepContent}>
            <div style={styles.questionBox}>
              <label style={styles.questionLabel}>1. What day of the week is it?</label>
              <div style={styles.optionsGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    style={selectedDay === day ? styles.optionBtnSelected : styles.optionBtn}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.questionRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.questionLabel}>2. What month is it?</label>
                <select
                  style={styles.selectInput}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">-- Select Month --</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '130px' }}>
                <label style={styles.questionLabel}>3. Today's Date (#)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g. 15"
                  style={styles.textInput}
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                />
              </div>

              <div style={{ width: '130px' }}>
                <label style={styles.questionLabel}>4. Current Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2026"
                  style={styles.textInput}
                  value={inputYear}
                  onChange={(e) => setInputYear(e.target.value)}
                />
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                style={styles.submitBtn}
                disabled={!selectedDay || !selectedMonth || !inputDate || !inputYear}
                onClick={handleSubmitTest}
              >
                <span>Submit Temporal Orientation Battery</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS STAGE */}
      {stage === 'RESULTS' && results && (
        <div style={styles.resultsCard}>
          <div style={styles.resultsHeader}>
            <div>
              <div style={styles.resultsBadge}>ASSESSMENT COMPLETE</div>
              <h2 style={styles.resultsTitle}>Temporal Orientation Report</h2>
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
              <div style={styles.metricLabel}>Day Accuracy</div>
              <div style={styles.metricVal}>{results.dayAccuracy}</div>
              <div style={styles.metricSub}>Day of Week Verification</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Month / Year Accuracy</div>
              <div style={styles.metricVal}>{results.monthYearAccuracy}</div>
              <div style={styles.metricSub}>Calendar Alignment</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Date Numerical Accuracy</div>
              <div style={styles.metricVal}>{results.dateAccuracy}</div>
              <div style={styles.metricSub}>Exact Day Number</div>
            </div>
            <div style={styles.metricTile}>
              <div style={styles.metricLabel}>Temporal Composite</div>
              <div style={{ ...styles.metricVal, color: results.isAbnormal ? '#EF4444' : '#10B981' }}>
                {results.score}
              </div>
              <div style={styles.metricSub}>
                {results.isAbnormal ? 'Elevated Cognitive Risk' : 'Low Neurological Risk'}
              </div>
            </div>
          </div>

          <div style={styles.clinicalNotes}>
            <h4 style={styles.notesTitle}>Neuropsychological Interpretation:</h4>
            <p style={styles.notesText}>
              Temporal orientation assessment evaluates calendar alignment, day of the week, date, and year tracking. {results.isAbnormal ? 'Patient demonstrated disorientation in calendar date or day tracking. Recommended further clinical follow-up for cognitive screening.' : 'Patient demonstrated full temporal orientation across calendar date, day of week, and year parameters.'}
            </p>
          </div>

          <div style={styles.resultsActions}>
            <button style={styles.secondaryBtn} onClick={handleRestart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Retest Temporal Orientation</span>
            </button>
            <button style={styles.primaryBtn} onClick={onBack}>
              <span>Return to Dashboard</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
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
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
    color: '#F8FAFC'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  headerInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  patientBadge: {
    background: '#0F172A',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600'
  },
  testBadge: {
    background: 'rgba(56, 189, 248, 0.1)',
    color: '#38BDF8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700'
  },
  mainCard: {
    background: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  cardHeader: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  subtitle: {
    margin: '6px 0 0 0',
    fontSize: '14px',
    color: '#94A3B8'
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  questionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  questionRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end'
  },
  questionLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#E2E8F0'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px'
  },
  optionBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#CBD5E1',
    padding: '12px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    transition: 'all 0.2s ease'
  },
  optionBtnSelected: {
    background: 'rgba(56, 189, 248, 0.2)',
    border: '2px solid #38BDF8',
    color: '#38BDF8',
    padding: '12px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'center'
  },
  selectInput: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    width: '100%',
    outline: 'none'
  },
  textInput: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    width: '100%',
    outline: 'none'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px'
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#10B981',
    color: '#FFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  secondaryBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  primaryBtn: {
    background: '#2563EB',
    color: '#FFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  resultsCard: {
    background: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  resultsBadge: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: '1px'
  },
  resultsTitle: {
    margin: '4px 0 0 0',
    fontSize: '24px',
    color: '#F8FAFC'
  },
  riskBadgeNormal: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10B981',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '14px'
  },
  riskBadgeHigh: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '14px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  metricTile: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '16px'
  },
  metricLabel: {
    fontSize: '13px',
    color: '#94A3B8',
    fontWeight: '600'
  },
  metricVal: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#F8FAFC',
    margin: '6px 0 2px 0'
  },
  metricSub: {
    fontSize: '12px',
    color: '#64748B'
  },
  clinicalNotes: {
    background: '#161E2E',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '20px'
  },
  notesTitle: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    color: '#38BDF8'
  },
  notesText: {
    margin: 0,
    fontSize: '14px',
    color: '#CBD5E1',
    lineHeight: '1.6'
  },
  resultsActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px'
  }
};
