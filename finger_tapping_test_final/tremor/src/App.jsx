import React, { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import GaitAnalysisPage from './components/GaitAnalysisPage.jsx';
import FingerTappingTest from './components/finger-tapping/FingerTappingTest.jsx';
import TremorAssessment from './components/assessments/TremorAssessment.jsx';
import ToeTappingTest from './components/assessments/ToeTappingTest.jsx';
import SitToStandTest from './components/assessments/SitToStandTest.jsx';
import PosturalStabilityTest from './components/assessments/PosturalStabilityTest.jsx';
import SpiralTest from './components/assessments/SpiralTest.jsx';
import MemoryTest from './components/assessments/MemoryTest.jsx';
import ClockDrawingTest from './components/assessments/ClockDrawingTest.jsx';
import AttentionTest from './components/assessments/AttentionTest.jsx';
import NeurologicalBackground from './components/NeurologicalBackground.jsx';

export default function App() {
  const [currentView, setCurrentView] = useState('DASHBOARD');

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

  const [postureCompleted, setPostureCompleted] = useState(false);
  const [postureResults, setPostureResults] = useState(null);

  const [spiralCompleted, setSpiralCompleted] = useState(false);
  const [spiralResults, setSpiralResults] = useState(null);

  const [memoryCompleted, setMemoryCompleted] = useState(false);
  const [memoryResults, setMemoryResults] = useState(null);

  const [clockCompleted, setClockCompleted] = useState(false);
  const [clockResults, setClockResults] = useState(null);

  const [attentionCompleted, setAttentionCompleted] = useState(false);
  const [attentionResults, setAttentionResults] = useState(null);

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
            onStartPostureTest={() => handleStartView('POSTURE')}
            postureCompleted={postureCompleted}
            postureResults={postureResults}
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
          />
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

        {currentView === 'POSTURE' && (
          <div style={styles.pageWrapper}>
            <PosturalStabilityTest
              onBack={handleBackToDashboard}
              onComplete={(res) => {
                setPostureResults(res);
                setPostureCompleted(true);
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
  pageWrapper: {
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    boxSizing: 'border-box'
  }
};