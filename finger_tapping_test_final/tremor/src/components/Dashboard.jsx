import React, { useState } from 'react';
import DiagnosticReportModal, { calculateMultiModalDiagnosis } from './DiagnosticReportModal.jsx';

export default function Dashboard({
  onStartGaitTest,
  gaitCompleted,
  gaitResults,
  onStartFingerTappingTest,
  fingerTappingCompleted,
  fingerTappingResults,
  onStartTremorTest,
  tremorCompleted,
  tremorResults,
  onStartToeTappingTest,
  toeTappingCompleted,
  toeTappingResults,
  onStartSitToStandTest,
  sitToStandCompleted,
  sitToStandResults,
  onStartSpiralTest,
  spiralCompleted,
  spiralResults,
  onStartMemoryTest,
  memoryCompleted,
  memoryResults,
  onStartClockTest,
  clockCompleted,
  clockResults,
  onStartAttentionTest,
  attentionCompleted,
  attentionResults,
  onStartOrientationTest,
  orientationCompleted,
  orientationResults,
  onStartAIChat,
  onStartPatientVitals
}) {
  const [activeCategory, setActiveCategory] = useState('ALL'); // ALL, MOVEMENT, COGNITIVE
  const [activeSidebar, setActiveSidebar] = useState('dashboard');
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const completedCount =
    (gaitCompleted ? 1 : 0) +
    (fingerTappingCompleted ? 1 : 0) +
    (tremorCompleted ? 1 : 0) +
    (spiralCompleted ? 1 : 0) +
    (memoryCompleted ? 1 : 0) +
    (clockCompleted ? 1 : 0) +
    (attentionCompleted ? 1 : 0) +
    (orientationCompleted ? 1 : 0);

  const diagnosis = calculateMultiModalDiagnosis({
    gaitResults,
    fingerTappingResults,
    tremorResults,
    spiralResults,
    memoryResults,
    orientationResults,
    clockResults,
    attentionResults,
    isDemoActive
  });

  const assessments = [
    {
      id: 'gait',
      number: '01',
      category: 'MOVEMENT',
      title: 'Gait Analysis',
      subtitle: 'Component 5',
      desc: 'Analyze walking speed, stride length, cadence, symmetry, and variability.',
      duration: 'Est. 2–3 min',
      completed: gaitCompleted,
      isFunctional: true,
      iconType: 'gait'
    },
    {
      id: 'finger-tapping',
      number: '02',
      category: 'MOVEMENT',
      title: 'Finger Tapping Test',
      subtitle: 'Comp 3',
      desc: 'Quantify tap rate, rhythm consistency, fatigue decrement, and amplitude.',
      duration: 'Est. 1–2 min',
      completed: fingerTappingCompleted,
      isFunctional: true,
      iconType: 'hand'
    },
    {
      id: 'tremor',
      number: '03',
      category: 'MOVEMENT',
      title: 'Hand Tremor Assessment',
      subtitle: 'Comp 2',
      desc: 'Quantify involuntary oscillatory motion, dominant frequency, and postural stability.',
      duration: 'Est. 1–2 min',
      completed: tremorCompleted,
      isFunctional: true,
      iconType: 'pulse'
    },
    {
      id: 'spiral',
      number: '04',
      category: 'MOVEMENT',
      title: 'Spiral / Handwriting Test',
      subtitle: 'Comp 8',
      desc: 'Analyze fine-motor control, line deviation, kinematic tremor, and stroke smoothness.',
      duration: 'Est. 2 min',
      completed: spiralCompleted,
      isFunctional: true,
      iconType: 'edit'
    },
    {
      id: 'memory',
      number: '05',
      category: 'COGNITIVE',
      title: 'Memory Recall Test',
      subtitle: 'Comp 9',
      desc: 'Evaluate immediate word registration, short-term retention, and retrieval accuracy.',
      duration: 'Est. 2–3 min',
      completed: memoryCompleted,
      isFunctional: true,
      iconType: 'brain'
    },
    {
      id: 'clock',
      number: '06',
      category: 'COGNITIVE',
      title: 'Clock Drawing Test',
      subtitle: 'Comp 10',
      desc: 'Assess visual-spatial organization, numerical sequencing, and executive planning.',
      duration: 'Est. 2 min',
      completed: clockCompleted,
      isFunctional: true,
      iconType: 'clock'
    },
    {
      id: 'attention',
      number: '07',
      category: 'COGNITIVE',
      title: 'Attention & Executive Function',
      subtitle: 'Comp 11',
      desc: 'Evaluate reaction latency, inhibitory control, and cognitive flexibility.',
      duration: 'Est. 2 min',
      completed: attentionCompleted,
      isFunctional: true,
      iconType: 'zap'
    },
    {
      id: 'orientation',
      number: '08',
      category: 'COGNITIVE',
      title: 'Orientation Test',
      subtitle: 'Comp 12',
      desc: 'Evaluate calendar alignment, day of the week, date, and temporal awareness.',
      duration: 'Est. 1–2 min',
      completed: orientationCompleted,
      isFunctional: true,
      iconType: 'compass'
    }
  ];

  const filtered = assessments.filter((a) => {
    if (activeCategory === 'ALL') return true;
    return a.category === activeCategory;
  });

  return (
    <div style={styles.dashboardLayout}>
      {/* LEFT SIDEBAR */}
      <aside style={styles.sidebar}>
        {/* Brand */}
        <div style={styles.sidebarBrand}>
          <div style={styles.brandIconBox}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <div style={styles.brandTitle}>
              NeuroGuard <span style={{ color: '#38BDF8' }}>AI</span>
            </div>
            <div style={styles.brandSubtitle}>Elderly Care & Screening</div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={styles.navMenu}>
          <button
            style={activeSidebar === 'dashboard' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveSidebar('dashboard')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button style={styles.navItem} onClick={onStartPatientVitals}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Patient Vitals</span>
          </button>



          <button style={styles.navItem} onClick={onStartAIChat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>AI Chat Assistant</span>
          </button>

          <button style={styles.navItem} onClick={() => setShowReportModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Reports Archive</span>
          </button>
        </nav>

        {/* Bottom Disclaimer Pill */}
        <div style={styles.sidebarBottom}>
          <div style={styles.pillDisclaimer}>
            <span style={styles.pillOrangeText}>Screening tool — not a medical diagnosis</span>
            <span style={styles.pillVersion}>NeuroGuard AI v2.4 • Component 5 Active</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={styles.mainContent}>
        {/* Top Header Bar */}
        <header style={styles.topHeader}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <div style={styles.headerTitle}>
                NeuroMotion <span style={{ color: '#38BDF8' }}>.AI</span>
              </div>
              <div style={styles.headerSubtitle}>Multimodal Neurological Screening</div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.countBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{completedCount} / {assessments.length}</span>
            </div>

            <button
              style={styles.demoModeBtn}
              onClick={() => setIsDemoActive(!isDemoActive)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{isDemoActive ? 'Demo Mode Active' : 'Demo Mode'}</span>
            </button>

            <button style={styles.reportBtn} onClick={() => setShowReportModal(true)}>
              Screening Report
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div style={styles.contentBody}>
          {/* Main Title Banner */}
          <div style={styles.bannerRow}>
            <div>
              <div style={styles.suiteTag}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                </svg>
                <span>COMPLETE ASSESSMENT SUITE</span>
              </div>
              <h1 style={styles.bannerHeading}>All {assessments.length} Neurological Screening Tests</h1>
              <p style={styles.bannerDesc}>
                Standardized digital assessments evaluating motor kinetics and cognitive capabilities.
              </p>
            </div>

            <div style={styles.bannerActions}>
              <button
                style={styles.enableDemoBtn}
                onClick={() => setIsDemoActive(!isDemoActive)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {isDemoActive ? 'Demo Mode Active' : 'Enable Demo Mode'}
              </button>
              <button style={styles.viewReportBtn} onClick={() => setShowReportModal(true)}>
                <span>View Report</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>

          {/* Assessment Battery Progress Bar */}
          <div style={styles.progressCard}>
            <div style={styles.progressHeader}>
              <span style={styles.progressTitle}>Assessment Battery Progress</span>
              <span style={styles.progressStats}>
                {completedCount} / {assessments.length} completed &nbsp;
                <strong style={{ color: '#F1F5F9' }}>{Math.round((completedCount / assessments.length) * 100)}%</strong>
              </span>
            </div>
            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${Math.round((completedCount / assessments.length) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* 100% COMPLETION / DEMO ALERT BANNER */}
          {(completedCount === assessments.length || isDemoActive) && (
            <div style={styles.completionBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={styles.bannerAlertIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div style={styles.bannerAlertTitle}>
                    {completedCount === assessments.length
                      ? "100% Assessment Battery Completed!"
                      : "Demo Synthesis Mode Active"}
                  </div>
                  <div style={styles.bannerAlertSub}>
                    Multi-Modal Diagnosis Calculated: Parkinson's Disease (with 40% Gait Kinematics Weightage) & Alzheimer's Risk Analysis.
                  </div>
                </div>
              </div>
              <button style={styles.bannerReportBtn} onClick={() => setShowReportModal(true)}>
                <span>View Parkinson's & Alzheimer's Diagnostic Report</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}

          {/* Filter Pills */}
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <button
                style={activeCategory === 'ALL' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setActiveCategory('ALL')}
              >
                All Tests ({assessments.length})
              </button>
              <button
                style={activeCategory === 'MOVEMENT' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setActiveCategory('MOVEMENT')}
              >
                Movement ({assessments.filter((a) => a.category === 'MOVEMENT').length})
              </button>
              <button
                style={activeCategory === 'COGNITIVE' ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setActiveCategory('COGNITIVE')}
              >
                Cognitive ({assessments.filter((a) => a.category === 'COGNITIVE').length})
              </button>
            </div>
            <span style={styles.showingText}>Showing {filtered.length} assessments</span>
          </div>

          {/* 10 ASSESSMENTS GRID */}
          <div style={styles.cardsGrid}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  ...styles.assessmentCard,
                  borderColor: item.isFunctional ? '#2563EB' : '#1F2937',
                  boxShadow: item.isFunctional ? '0 0 20px rgba(37, 99, 235, 0.15)' : 'none',
                  cursor: item.isFunctional ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (!item.isFunctional) return;
                  switch (item.id) {
                    case 'gait': onStartGaitTest?.(); break;
                    case 'finger-tapping': onStartFingerTappingTest?.(); break;
                    case 'tremor': onStartTremorTest?.(); break;
                    case 'toe-tapping': onStartToeTappingTest?.(); break;
                    case 'sit-to-stand': onStartSitToStandTest?.(); break;
                    case 'spiral': onStartSpiralTest?.(); break;
                    case 'memory': onStartMemoryTest?.(); break;
                    case 'clock': onStartClockTest?.(); break;
                    case 'attention': onStartAttentionTest?.(); break;
                    case 'orientation': onStartOrientationTest?.(); break;
                    default: break;
                  }
                }}
              >
                {/* Card Top */}
                <div style={styles.cardTopRow}>
                  <div style={styles.cardHeaderLeft}>
                    <span style={styles.testNumber}>{item.number}</span>
                    <span style={styles.cardCategory}>{item.category}</span>
                  </div>
                  <div>
                    {item.completed ? (
                      <span style={styles.completedBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Completed
                      </span>
                    ) : (
                      <span style={styles.notStartedBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Not started
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Main */}
                <div style={styles.cardBody}>
                  <div style={styles.cardIconBox}>
                    <CardIcon type={item.iconType} />
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>{item.title}</h3>
                    <p style={styles.cardDesc}>{item.desc}</p>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={styles.cardFooter}>
                  <span style={styles.cardDuration}>{item.duration}</span>
                  {item.isFunctional ? (
                    <button
                      style={item.completed ? styles.retestCardBtn : styles.startTestBtn}
                      onClick={() => {
                        switch (item.id) {
                          case 'gait': onStartGaitTest?.(); break;
                          case 'finger-tapping': onStartFingerTappingTest?.(); break;
                          case 'tremor': onStartTremorTest?.(); break;
                          case 'toe-tapping': onStartToeTappingTest?.(); break;
                          case 'sit-to-stand': onStartSitToStandTest?.(); break;
                          case 'spiral': onStartSpiralTest?.(); break;
                          case 'memory': onStartMemoryTest?.(); break;
                          case 'clock': onStartClockTest?.(); break;
                          case 'attention': onStartAttentionTest?.(); break;
                          case 'orientation': onStartOrientationTest?.(); break;
                          default: break;
                        }
                      }}
                    >
                      {item.completed ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          <span>Review / Retest</span>
                        </>
                      ) : (
                        <>
                          <span>Start Test</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <button style={styles.disabledStartBtn} disabled>
                      <span>Start Test</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* DIAGNOSTIC SYNTHESIS REPORT MODAL */}
      {showReportModal && (
        <DiagnosticReportModal
          onClose={() => setShowReportModal(false)}
          diagnosis={diagnosis}
          completedCount={completedCount}
          totalTests={assessments.length}
        />
      )}
    </div>
  );
}

function CardIcon({ type }) {
  switch (type) {
    case 'gait':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
          <circle cx="12" cy="4" r="2" />
          <path d="M15 8l-3 4-2-2-4 4" />
          <path d="M13 14l2 7M9 16l-2 5" />
        </svg>
      );
    case 'hand':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      );
    case 'pulse':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'arrowDown':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 12 16 16 12" />
          <line x1="12" y1="8" x2="12" y2="16" />
        </svg>
      );
    case 'userCheck':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      );
    case 'shield':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'edit':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'brain':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z" />
        </svg>
      );
    case 'clock':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'compass':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
  }
}

const styles = {
  dashboardLayout: {
    display: 'flex',
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: '#080C14',
    color: '#F8FAFC',
    overflowX: 'hidden'
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#0B0F19',
    borderRight: '1px solid #1E293B',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  sidebarBrand: {
    padding: '20px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #1E293B'
  },
  brandIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: '-0.01em'
  },
  brandSubtitle: {
    fontSize: '0.68rem',
    color: '#64748B'
  },
  navMenu: {
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    overflowY: 'auto'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease'
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    color: '#38BDF8',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%'
  },
  navItemGait: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '8px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    boxShadow: '0 2px 8px rgba(56, 189, 248, 0.1)'
  },
  newBadge: {
    fontSize: '0.6rem',
    fontWeight: '800',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    padding: '1px 5px',
    borderRadius: '4px',
    marginLeft: 'auto'
  },
  sidebarBottom: {
    padding: '14px',
    borderTop: '1px solid #1E293B'
  },
  pillDisclaimer: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  pillOrangeText: {
    fontSize: '0.68rem',
    color: '#F59E0B',
    fontWeight: '700'
  },
  pillVersion: {
    fontSize: '0.62rem',
    color: '#64748B'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    backgroundColor: '#080C14'
  },
  topHeader: {
    height: '64px',
    borderBottom: '1px solid #1E293B',
    backgroundColor: '#0B0F19',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerIconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#2563EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  headerSubtitle: {
    fontSize: '0.68rem',
    color: '#64748B'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  countBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid #334155',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#38BDF8'
  },
  demoModeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid #334155',
    color: '#94A3B8',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  reportBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)'
  },
  contentBody: {
    padding: '28px',
    maxWidth: '1240px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  bannerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  suiteTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: '0.06em',
    marginBottom: '6px'
  },
  bannerHeading: {
    fontSize: '1.85rem',
    fontWeight: '800',
    margin: '0 0 6px 0',
    color: '#F8FAFC',
    letterSpacing: '-0.02em'
  },
  bannerDesc: {
    fontSize: '0.84rem',
    color: '#64748B',
    margin: 0
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  enableDemoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#0F172A',
    color: '#94A3B8',
    border: '1px solid #1E293B',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  viewReportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  progressCard: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '18px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  completionBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '14px',
    padding: '16px 22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.1)'
  },
  bannerAlertIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  bannerAlertTitle: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#10B981'
  },
  bannerAlertSub: {
    fontSize: '0.78rem',
    color: '#CBD5E1',
    marginTop: '2px'
  },
  bannerReportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#10B981',
    color: '#064E3B',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
    flexShrink: 0
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressTitle: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  progressStats: {
    fontSize: '0.76rem',
    color: '#94A3B8'
  },
  progressBarTrack: {
    height: '6px',
    backgroundColor: '#1E293B',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #38BDF8 0%, #2563EB 100%)',
    borderRadius: '3px',
    transition: 'width 0.4s ease'
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#0B0F19',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #1E293B'
  },
  filterBtn: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  filterBtnActive: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  showingText: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '18px'
  },
  assessmentCard: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.2s ease'
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  testNumber: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#94A3B8'
  },
  cardCategory: {
    fontSize: '0.66rem',
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: '0.04em'
  },
  completedBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    padding: '3px 8px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  notStartedBadge: {
    fontSize: '0.68rem',
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: '3px 8px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  cardBody: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    flex: 1
  },
  cardIconBox: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid #1E293B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.76rem',
    color: '#94A3B8',
    lineHeight: 1.45
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #1E293B'
  },
  cardDuration: {
    fontSize: '0.74rem',
    color: '#64748B'
  },
  startTestBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
  },
  retestCardBtn: {
    backgroundColor: 'transparent',
    color: '#38BDF8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  disabledStartBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    color: '#64748B',
    border: '1px solid #1E293B',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: '600',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }
};
