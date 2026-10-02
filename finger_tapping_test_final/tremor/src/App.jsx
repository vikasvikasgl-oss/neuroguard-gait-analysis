import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import GaitAnalysisPage from './components/GaitAnalysisPage.jsx';
import FingerTappingTest from './components/finger-tapping/FingerTappingTest.jsx';
import TremorAssessment from './components/assessments/TremorAssessment.jsx';
import ToeTappingTest from './components/assessments/ToeTappingTest.jsx';
import SitToStandTest from './components/assessments/SitToStandTest.jsx';
import MemoryTest from './components/assessments/MemoryTest.jsx';
import SpiralTest from './components/assessments/SpiralTest.jsx';
import ClockDrawingTest from './components/assessments/ClockDrawingTest.jsx';
import AttentionTest from './components/assessments/AttentionTest.jsx';
import OrientationTest from './components/assessments/OrientationTest.jsx';
import AIChatAssistant from './components/AIChatAssistant.jsx';
import PatientVitalsPage from './components/PatientVitalsPage.jsx';
import NeurologicalBackground from './components/NeurologicalBackground.jsx';

export default function App() {
  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('neuroguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(currentUser ? 'DASHBOARD' : 'LOGIN');

  // Sync view when user logs out or logs in
  useEffect(() => {
    if (!currentUser && currentView !== 'LOGIN') {
      setCurrentView('LOGIN');
    }
  }, [currentUser]);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    localStorage.removeItem('neuroguard_user');
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  // Test completion & results states
  const [gaitCompleted, setGaitCompleted] = useState(false);
  const [gaitResults, setGaitResults] = useState(null);

  const [fingerTappingCompleted, setFingerTappingCompleted] = useState(false);
  const [fingerTappingResults, setFingerTappingResults] = useState(null);

  const [tremorCompleted, setTremorCompleted] = useState(false);
  const [tremorResults, setTremorResults] = useState(null);

  const [toeTappingCompleted, setToeTappingCompleted] = useState(false);
  const [toeTappingResults, setToeTappingResults] = useState(null);

  const [sitToStandCompleted, setSitToStandCompleted] = useState(false);
  const [sitToStandResults, setSitToStandResults] = useState(null);

  const [spiralCompleted, setSpiralCompleted] = useState(false);
  const [spiralResults, setSpiralResults] = useState(null);

  const [memoryCompleted, setMemoryCompleted] = useState(false);
  const [memoryResults, setMemoryResults] = useState(null);

  const [clockCompleted, setClockCompleted] = useState(false);
  const [clockResults, setClockResults] = useState(null);

  const [attentionCompleted, setAttentionCompleted] = useState(false);
  const [attentionResults, setAttentionResults] = useState(null);

  const [orientationCompleted, setOrientationCompleted] = useState(false);
  const [orientationResults, setOrientationResults] = useState(null);

  const handleStartView = (viewName) => {
    setCurrentView(viewName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDashboard = () => {
    setCurrentView('DASHBOARD');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={styles.appContainer}>
      <NeurologicalBackground />

      <div style={styles.contentLayer}>
        {/* Render Login Page at start if not logged in or in LOGIN view */}
        {currentView === 'LOGIN' || !currentUser ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* Top User Session Header Bar */}
            <div style={styles.userHeaderBar}>
              <div style={styles.userInfoLeft}>
                <div style={styles.userAvatar}>
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={styles.userName}>{currentUser.fullName || currentUser.username}</div>
                  <div style={styles.userRoleBadge}>{currentUser.role || 'Clinician'} &bull; SQLite DB Active</div>
                </div>
              </div>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>

            {/* Dashboard and Test Views */}
            {currentView === 'DASHBOARD' && (
              <Dashboard
                onStartGaitTest={() => handleStartView('GAIT_ANALYSIS')}
                gaitCompleted={gaitCompleted}
                gaitResults={gaitResults}
                onStartFingerTappingTest={() => handleStartView('FINGER_TAPPING')}
                fingerTappingCompleted={fingerTappingCompleted}
                fingerTappingResults={fingerTappingResults}
                onStartTremorTest={() => handleStartView('TREMOR')}
                tremorCompleted={tremorCompleted}
                tremorResults={tremorResults}
                onStartToeTappingTest={() => handleStartView('TOE_TAPPING')}
                toeTappingCompleted={toeTappingCompleted}
                toeTappingResults={toeTappingResults}
                onStartSitToStandTest={() => handleStartView('SIT_TO_STAND')}
                sitToStandCompleted={sitToStandCompleted}
                sitToStandResults={sitToStandResults}
                onStartSpiralTest={() => handleStartView('SPIRAL')}
                spiralCompleted={spiralCompleted}
                spiralResults={spiralResults}
                onStartMemoryTest={() => handleStartView('MEMORY')}
                memoryCompleted={memoryCompleted}
                memoryResults={memoryResults}
                onStartClockTest={() => handleStartView('CLOCK')}
                clockCompleted={clockCompleted}
                clockResults={clockResults}
                onStartAttentionTest={() => handleStartView('ATTENTION')}
                attentionCompleted={attentionCompleted}
                attentionResults={attentionResults}
                onStartOrientationTest={() => handleStartView('ORIENTATION')}
                orientationCompleted={orientationCompleted}
                orientationResults={orientationResults}
                onStartAIChat={() => handleStartView('AI_CHAT')}
                onStartPatientVitals={() => handleStartView('PATIENT_VITALS')}
              />
            )}

            {currentView === 'PATIENT_VITALS' && (
              <div style={styles.pageWrapper}>
                <PatientVitalsPage onBack={handleBackToDashboard} />
              </div>
            )}

            {currentView === 'AI_CHAT' && (
              <div style={styles.pageWrapper}>
                <AIChatAssistant onBack={handleBackToDashboard} />
              </div>
            )}

            {currentView === 'GAIT_ANALYSIS' && (
              <div style={styles.pageWrapper}>
                <GaitAnalysisPage
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setGaitResults(res);
                    setGaitCompleted(true);
                  }}
                  initialCompleted={gaitCompleted}
                />
              </div>
            )}

            {currentView === 'FINGER_TAPPING' && (
              <div style={styles.pageWrapper}>
                <FingerTappingTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setFingerTappingResults(res);
                    setFingerTappingCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'TREMOR' && (
              <div style={styles.pageWrapper}>
                <TremorAssessment
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setTremorResults(res);
                    setTremorCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'TOE_TAPPING' && (
              <div style={styles.pageWrapper}>
                <ToeTappingTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setToeTappingResults(res);
                    setToeTappingCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'SIT_TO_STAND' && (
              <div style={styles.pageWrapper}>
                <SitToStandTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setSitToStandResults(res);
                    setSitToStandCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'SPIRAL' && (
              <div style={styles.pageWrapper}>
                <SpiralTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setSpiralResults(res);
                    setSpiralCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'MEMORY' && (
              <div style={styles.pageWrapper}>
                <MemoryTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setMemoryResults(res);
                    setMemoryCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'CLOCK' && (
              <div style={styles.pageWrapper}>
                <ClockDrawingTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setClockResults(res);
                    setClockCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'ATTENTION' && (
              <div style={styles.pageWrapper}>
                <AttentionTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setAttentionResults(res);
                    setAttentionCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}

            {currentView === 'ORIENTATION' && (
              <div style={styles.pageWrapper}>
                <OrientationTest
                  onBack={handleBackToDashboard}
                  onComplete={(res) => {
                    setOrientationResults(res);
                    setOrientationCompleted(true);
                  }}
                  patientId="PT-7049"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#080C14',
    color: '#F8FAFC',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: 'relative',
    overflowX: 'hidden'
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: '100vh'
  },
  userHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
    padding: '10px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  userInfoLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    border: '1px solid #38BDF8',
    color: '#38BDF8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px'
  },
  userName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  userRoleBadge: {
    fontSize: '11px',
    color: '#38BDF8'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#FCA5A5',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  pageWrapper: {
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    boxSizing: 'border-box'
  }
};