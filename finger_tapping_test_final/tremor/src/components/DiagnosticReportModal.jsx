import React from 'react';

export function calculateMultiModalDiagnosis({
  gaitResults,
  fingerTappingResults,
  tremorResults,
  spiralResults,
  memoryResults,
  orientationResults,
  clockResults,
  attentionResults,
  isDemoActive
}) {
  // --- PARKINSON'S DISEASE BIOMARKER WEIGHTING ---
  // Gait Analysis: 40% Weightage (Primary Parkinsonian Kinematic Biomarker)
  const gaitRisk = gaitResults?.riskScore ?? (gaitResults?.isAbnormal ? 78 : (isDemoActive ? 68 : 15));
  
  // Hand Tremor Assessment: 25% Weightage (4-7 Hz resting tremor peak frequency)
  const tremorRisk = tremorResults?.riskScore ?? (tremorResults?.isAbnormal ? 80 : (isDemoActive ? 62 : 12));
  
  // Finger Tapping Test: 20% Weightage (bradykinesia, amplitude decrement & rhythm variability)
  const tappingRisk = fingerTappingResults?.riskScore ?? (fingerTappingResults?.isAbnormal ? 72 : (isDemoActive ? 55 : 10));
  
  // Spiral / Handwriting Test: 15% Weightage (micrographia, fine-motor tremor RMSE)
  const spiralRisk = spiralResults?.riskScore ?? (spiralResults?.isTremulous ? 75 : (isDemoActive ? 50 : 10));

  // PARKINSON'S DISEASE COMPOSITE RISK SCORE (%)
  const parkinsonScore = Math.round(
    (gaitRisk * 0.40) +
    (tremorRisk * 0.25) +
    (tappingRisk * 0.20) +
    (spiralRisk * 0.15)
  );

  // --- ALZHEIMER'S DISEASE BIOMARKER WEIGHTING ---
  // Memory Recall Test: 35% Weightage (episodic short-term retention & intrusion errors)
  const memoryRisk = memoryResults?.riskScore ?? (memoryResults?.isAbnormal ? 85 : (isDemoActive ? 25 : 12));
  
  // Orientation Test: 30% Weightage (temporal date/day/month & spatial location awareness)
  const orientationRisk = orientationResults?.riskScore ?? (orientationResults?.isAbnormal ? 80 : (isDemoActive ? 20 : 10));
  
  // Clock Drawing Test: 20% Weightage (visual-spatial organization & executive planning)
  const clockRisk = clockResults?.riskScore ?? (clockResults?.isAbnormal ? 75 : (isDemoActive ? 18 : 10));
  
  // Attention & Executive Function: 15% Weightage (reaction latency & inhibitory control)
  const attentionRisk = attentionResults?.riskScore ?? (attentionResults?.isAbnormal ? 65 : (isDemoActive ? 22 : 10));

  // ALZHEIMER'S DISEASE COMPOSITE RISK SCORE (%)
  const alzheimerScore = Math.round(
    (memoryRisk * 0.35) +
    (orientationRisk * 0.30) +
    (clockRisk * 0.20) +
    (attentionRisk * 0.15)
  );

  // Classifications
  const parkinsonClass =
    parkinsonScore >= 60
      ? 'High Risk for Parkinsonian Motor Syndrome'
      : parkinsonScore >= 30
      ? 'Moderate Motor Kinetics Risk'
      : 'Low Risk for Parkinson’s Disease';

  const alzheimerClass =
    alzheimerScore >= 60
      ? 'High Risk for Alzheimer’s / Cognitive Decline'
      : alzheimerScore >= 30
      ? 'Moderate Cognitive Impairment Risk'
      : 'Low Risk for Alzheimer’s Disease';

  let finalDiagnosis = '';
  let overallRiskLevel = 'LOW'; // LOW, MODERATE, HIGH

  if (parkinsonScore >= 55 && alzheimerScore >= 55) {
    overallRiskLevel = 'HIGH';
    finalDiagnosis = "High Risk for Dual Neurodegenerative Profile (Combined Parkinsonian & Alzheimer's Indicators)";
  } else if (parkinsonScore >= 55) {
    overallRiskLevel = 'HIGH';
    finalDiagnosis = "High Probability of Parkinson's Disease (Primary Marker: Gait Kinematics & Motor Micro-Oscillations)";
  } else if (alzheimerScore >= 55) {
    overallRiskLevel = 'HIGH';
    finalDiagnosis = "High Probability of Alzheimer's Disease / MCI (Primary Marker: Memory Recall & Spatial-Temporal Orientation)";
  } else if (parkinsonScore >= 30 || alzheimerScore >= 30) {
    overallRiskLevel = 'MODERATE';
    finalDiagnosis = "Moderate Neurological Risk — Clinical Follow-Up & Baseline Monitoring Recommended";
  } else {
    overallRiskLevel = 'LOW';
    finalDiagnosis = "Normal Healthy Neurological Profile — Low Risk Detected Across All Motor & Cognitive Domains";
  }

  return {
    parkinsonScore,
    alzheimerScore,
    parkinsonClass,
    alzheimerClass,
    finalDiagnosis,
    overallRiskLevel,
    breakdown: {
      gaitRisk,
      tremorRisk,
      tappingRisk,
      spiralRisk,
      memoryRisk,
      orientationRisk,
      clockRisk,
      attentionRisk
    }
  };
}

export default function DiagnosticReportModal({ onClose, diagnosis, completedCount, totalTests }) {
  const isHighRisk = diagnosis.overallRiskLevel === 'HIGH';
  const isModRisk = diagnosis.overallRiskLevel === 'MODERATE';

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        {/* Header Bar */}
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.headerTag}>
              <span>INTEGRATED MULTI-MODAL DIAGNOSTIC SYNTHESIS</span>
            </div>
            <h2 style={styles.modalTitle}>Comprehensive Neurological Screening Report</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Primary Diagnostic Banner */}
        <div style={isHighRisk ? styles.diagBoxHigh : isModRisk ? styles.diagBoxMod : styles.diagBoxLow}>
          <div style={styles.diagHeaderRow}>
            <div style={styles.diagIconCircle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <div style={styles.diagLabel}>OVERALL DIFFERENTIAL DIAGNOSIS</div>
              <h3 style={styles.diagResultTitle}>{diagnosis.finalDiagnosis}</h3>
            </div>
          </div>
          <p style={styles.diagDesc}>
            Multi-factor synthesis calculated across {completedCount} / {totalTests} completed assessment battery components, weighting motor kinetics (with primary 40% weightage on Gait Kinematics) and cognitive temporal/spatial orientation markers.
          </p>
        </div>

        {/* Dual Disease Risk Meters Grid */}
        <div style={styles.dualMeterGrid}>
          {/* PARKINSON'S DISEASE CARD */}
          <div style={styles.meterCard}>
            <div style={styles.meterHeader}>
              <div>
                <span style={styles.meterCategory}>MOTOR NEUROLOGICAL DOMAIN</span>
                <h4 style={styles.meterTitle}>Parkinson’s Disease Risk</h4>
              </div>
              <span style={diagnosis.parkinsonScore >= 60 ? styles.badgeRed : styles.badgeGreen}>
                {diagnosis.parkinsonClass}
              </span>
            </div>

            <div style={styles.scoreRow}>
              <span style={styles.scoreNumber}>{diagnosis.parkinsonScore}%</span>
              <span style={styles.scoreSubText}>Composite Probability</span>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${diagnosis.parkinsonScore}%`,
                  backgroundColor: diagnosis.parkinsonScore >= 60 ? '#EF4444' : diagnosis.parkinsonScore >= 30 ? '#F59E0B' : '#10B981'
                }}
              />
            </div>

            <div style={styles.weightageNote}>
              <strong style={{ color: '#38BDF8' }}>★ Gait Analysis Weightage (40%)</strong>: Evaluates stride length, cadence variability, gait symmetry index (GSI), and freezing of gait (FoG).
            </div>

            <div style={styles.breakdownList}>
              <div style={styles.breakdownItem}>
                <span>Gait Kinematics (40% Wt)</span>
                <strong>{diagnosis.breakdown.gaitRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Hand Tremor (25% Wt)</span>
                <strong>{diagnosis.breakdown.tremorRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Finger Tapping (20% Wt)</span>
                <strong>{diagnosis.breakdown.tappingRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Handwriting / Spiral (15% Wt)</span>
                <strong>{diagnosis.breakdown.spiralRisk}% Risk</strong>
              </div>
            </div>
          </div>

          {/* ALZHEIMER'S DISEASE CARD */}
          <div style={styles.meterCard}>
            <div style={styles.meterHeader}>
              <div>
                <span style={styles.meterCategory}>COGNITIVE & MEMORY DOMAIN</span>
                <h4 style={styles.meterTitle}>Alzheimer’s Disease Risk</h4>
              </div>
              <span style={diagnosis.alzheimerScore >= 60 ? styles.badgeRed : styles.badgeGreen}>
                {diagnosis.alzheimerClass}
              </span>
            </div>

            <div style={styles.scoreRow}>
              <span style={styles.scoreNumber}>{diagnosis.alzheimerScore}%</span>
              <span style={styles.scoreSubText}>Composite Probability</span>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${diagnosis.alzheimerScore}%`,
                  backgroundColor: diagnosis.alzheimerScore >= 60 ? '#EF4444' : diagnosis.alzheimerScore >= 30 ? '#F59E0B' : '#10B981'
                }}
              />
            </div>

            <div style={styles.weightageNote}>
              <strong style={{ color: '#C084FC' }}>★ Memory & Orientation Weightage (65%)</strong>: Evaluates short-term verbal retention, calendar alignment, and temporal date/day accuracy.
            </div>

            <div style={styles.breakdownList}>
              <div style={styles.breakdownItem}>
                <span>Memory Recall (35% Wt)</span>
                <strong>{diagnosis.breakdown.memoryRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Orientation Test (30% Wt)</span>
                <strong>{diagnosis.breakdown.orientationRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Clock Drawing (20% Wt)</span>
                <strong>{diagnosis.breakdown.clockRisk}% Risk</strong>
              </div>
              <div style={styles.breakdownItem}>
                <span>Attention / Exec (15% Wt)</span>
                <strong>{diagnosis.breakdown.attentionRisk}% Risk</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.modalFooter}>
          <button style={styles.printBtn} onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Clinical PDF</span>
          </button>

          <button style={styles.closeActionBtn} onClick={onClose}>
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  modalCard: {
    background: '#0B0F19',
    border: '1px solid #1E293B',
    borderRadius: '20px',
    maxWidth: '960px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    color: '#F8FAFC'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  headerTag: {
    color: '#38BDF8',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '1px'
  },
  modalTitle: {
    margin: '4px 0 0 0',
    fontSize: '24px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  closeBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  diagBoxHigh: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '28px'
  },
  diagBoxMod: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '28px'
  },
  diagBoxLow: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '28px'
  },
  diagHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px'
  },
  diagIconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#1E293B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#38BDF8'
  },
  diagLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: '0.5px'
  },
  diagResultTitle: {
    margin: '2px 0 0 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  diagDesc: {
    margin: 0,
    fontSize: '13.5px',
    color: '#CBD5E1',
    lineHeight: '1.5'
  },
  dualMeterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '28px'
  },
  meterCard: {
    background: '#141A29',
    border: '1px solid #1E293B',
    borderRadius: '16px',
    padding: '24px'
  },
  meterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  meterCategory: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: '0.5px'
  },
  meterTitle: {
    margin: '2px 0 0 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  badgeRed: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px'
  },
  badgeGreen: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px'
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '10px'
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  scoreSubText: {
    fontSize: '13px',
    color: '#94A3B8'
  },
  progressTrack: {
    height: '10px',
    background: '#1E293B',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.4s ease'
  },
  weightageNote: {
    background: '#0F172A',
    border: '1px solid #1E293B',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#CBD5E1',
    lineHeight: '1.5',
    marginBottom: '16px'
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#94A3B8',
    borderBottom: '1px solid #1E293B',
    paddingBottom: '6px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #1E293B'
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#38BDF8',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeActionBtn: {
    background: '#2563EB',
    color: '#FFF',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};
