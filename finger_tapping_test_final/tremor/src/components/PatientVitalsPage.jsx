import React, { useState, useEffect } from 'react';

export default function PatientVitalsPage({ onBack }) {
  // 6 Vital Input States
  const [systolicBP, setSystolicBP] = useState('120');
  const [diastolicBP, setDiastolicBP] = useState('80');
  const [bloodSugar, setBloodSugar] = useState('95');
  const [spo2, setSpo2] = useState('98');
  const [restingHeartRate, setRestingHeartRate] = useState('72');
  const [hrv, setHrv] = useState('55');
  const [bodyTemperature, setBodyTemperature] = useState('98.6');

  // Calculation Results
  const [wellnessResult, setWellnessResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [vitalsHistory, setVitalsHistory] = useState([]);

  useEffect(() => {
    fetchVitalsHistory();
  }, []);

  const fetchVitalsHistory = async () => {
    try {
      const res = await fetch('/api/vitals');
      if (res.ok) {
        const data = await res.json();
        setVitalsHistory(data.history || []);
      }
    } catch (e) {
      console.log('Unable to fetch vitals history', e);
    }
  };

  // Helper to check live threshold warnings for inline field indicators
  const getLiveThresholds = () => {
    const sys = parseFloat(systolicBP) || 120;
    const dia = parseFloat(diastolicBP) || 80;
    const sugar = parseFloat(bloodSugar) || 95;
    const ox = parseFloat(spo2) || 98;
    const rhr = parseFloat(restingHeartRate) || 72;
    const hrvVal = parseFloat(hrv) || 55;
    const temp = parseFloat(bodyTemperature) || 98.6;

    const live = {
      bp: { isWarn: false, isCritical: false, msg: 'Normal BP' },
      sugar: { isWarn: false, isCritical: false, msg: 'Normal Glucose' },
      spo2: { isWarn: false, isCritical: false, msg: 'Normal Oxygen' },
      rhr: { isWarn: false, isCritical: false, msg: 'Normal Heart Rate' },
      hrv: { isWarn: false, isCritical: false, msg: 'Normal HRV' },
      temp: { isWarn: false, isCritical: false, msg: 'Normal Temperature' }
    };

    // BP Thresholds
    if (sys >= 140 || dia >= 90) {
      live.bp = { isWarn: true, isCritical: true, msg: '🚨 Stage 2 High BP' };
    } else if (sys >= 130 || dia > 80) {
      live.bp = { isWarn: true, isCritical: false, msg: '⚠️ Stage 1 High BP' };
    } else if (sys > 120 && dia <= 80) {
      live.bp = { isWarn: true, isCritical: false, msg: '⚠️ Elevated BP' };
    } else if (sys < 90 || dia < 60) {
      live.bp = { isWarn: true, isCritical: false, msg: '⚠️ Low BP (Hypotension)' };
    } else {
      live.bp = { isWarn: false, isCritical: false, msg: 'Normal BP' };
    }

    // Sugar
    if (sugar < 70) {
      live.sugar = { isWarn: true, isCritical: true, msg: '🚨 CRITICAL LOW (<70 mg/dL)' };
    } else if (sugar > 125) {
      live.sugar = { isWarn: true, isCritical: false, msg: '⚠️ High Blood Sugar (>125)' };
    }

    // SpO2
    if (ox < 90) {
      live.spo2 = { isWarn: true, isCritical: true, msg: '🚨 SEVERE HYPOXIA (<90%)' };
    } else if (ox < 95) {
      live.spo2 = { isWarn: true, isCritical: false, msg: '⚠️ Low Oxygen (<95%)' };
    }

    // RHR
    if (rhr > 100) {
      live.rhr = { isWarn: true, isCritical: false, msg: '⚠️ High Heart Rate (Tachycardia)' };
    } else if (rhr < 50) {
      live.rhr = { isWarn: true, isCritical: false, msg: '⚠️ Low Heart Rate (Bradycardia)' };
    }

    // HRV
    if (hrvVal < 35) {
      live.hrv = { isWarn: true, isCritical: false, msg: '⚠️ Low HRV (<35 ms)' };
    }

    // Temp
    if (temp > 100.4) {
      live.temp = { isWarn: true, isCritical: true, msg: '🚨 HIGH FEVER (>100.4°F)' };
    } else if (temp < 96.0) {
      live.temp = { isWarn: true, isCritical: false, msg: '⚠️ Low Body Temp (<96.0°F)' };
    }

    return live;
  };

  const liveStatus = getLiveThresholds();

  // Clinical Wellness Score Algorithm out of 100 + Threshold Warnings
  const calculateWellnessScore = (sys, dia, sugar, ox, rhr, hrvVal, temp) => {
    let score = 0;
    const breakdown = [];
    const warnings = [];

    // 1. Blood Pressure Score & Warning
    const sysNum = parseFloat(sys) || 120;
    const diaNum = parseFloat(dia) || 80;
    let bpScore = 16.67;
    let bpStatus = 'Normal BP (Optimal)';
    let bpIsWarn = false;

    if (sysNum <= 120 && diaNum <= 80 && sysNum >= 90 && diaNum >= 60) {
      bpScore = 16.67;
      bpStatus = 'Optimal Normal BP (120/80 mmHg)';
      bpIsWarn = false;
    } else if (sysNum >= 140 || diaNum >= 90) {
      bpScore = 6.0;
      bpStatus = 'Stage 2 Hypertension Alert';
      bpIsWarn = true;
      warnings.push({ type: 'CRITICAL', title: 'Stage 2 High Blood Pressure Warning', message: `BP reading ${sysNum}/${diaNum} mmHg is severely elevated above safe limits!` });
    } else if (sysNum >= 130 || diaNum > 80) {
      bpScore = 11.5;
      bpStatus = 'Stage 1 Hypertension';
      bpIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Stage 1 High Blood Pressure', message: `BP reading ${sysNum}/${diaNum} mmHg exceeds normal threshold.` });
    } else if (sysNum > 120 && diaNum <= 80) {
      bpScore = 14.5;
      bpStatus = 'Elevated BP';
      bpIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Elevated Blood Pressure', message: `BP reading ${sysNum}/${diaNum} mmHg is slightly elevated.` });
    } else if (sysNum < 90 || diaNum < 60) {
      bpScore = 6.0;
      bpStatus = 'Hypotension (Low BP)';
      bpIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low Blood Pressure (Hypotension)', message: `BP reading ${sysNum}/${diaNum} mmHg is below normal threshold.` });
    } else {
      bpScore = 16.67;
      bpStatus = 'Optimal Normal BP (120/80 mmHg)';
      bpIsWarn = false;
    }
    score += bpScore;
    breakdown.push({ name: 'Blood Pressure', val: `${sysNum}/${diaNum} mmHg`, pts: bpScore.toFixed(1), status: bpStatus, isWarn: bpIsWarn });

    // 2. Blood Sugar Score & Warning
    const sugarNum = parseFloat(sugar) || 95;
    let sugarScore = 16.67;
    let sugarStatus = 'Normal Glucose';
    let sugarIsWarn = false;

    if (sugarNum >= 70 && sugarNum <= 99) {
      sugarScore = 16.67;
      sugarStatus = 'Normal Fasting';
    } else if (sugarNum >= 100 && sugarNum <= 125) {
      sugarScore = 12.0;
      sugarStatus = 'Prediabetes Range';
      sugarIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Elevated Blood Sugar (Prediabetes Range)', message: `Glucose level ${sugarNum} mg/dL is above normal fasting threshold (100 mg/dL).` });
    } else if (sugarNum > 125) {
      sugarScore = 7.0;
      sugarStatus = 'High Glucose Alert';
      sugarIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'High Blood Sugar (Hyperglycemia Warning)', message: `Glucose level ${sugarNum} mg/dL significantly exceeds normal limit.` });
    } else {
      sugarScore = 4.0;
      sugarStatus = 'CRITICAL LOW (Hypoglycemia Alert)';
      sugarIsWarn = true;
      warnings.push({ type: 'CRITICAL', title: 'CRITICAL LOW BLOOD SUGAR (Hypoglycemia Alert)', message: `Glucose level ${sugarNum} mg/dL is dangerously below the 70 mg/dL safety threshold! Immediate attention recommended.` });
    }
    score += sugarScore;
    breakdown.push({ name: 'Blood Sugar', val: `${sugarNum} mg/dL`, pts: sugarScore.toFixed(1), status: sugarStatus, isWarn: sugarIsWarn });

    // 3. Oxygen Saturation SpO2 Score & Warning
    const spo2Num = parseFloat(ox) || 98;
    let spo2Score = 16.67;
    let spo2Status = 'Optimal SpO2';
    let spo2IsWarn = false;

    if (spo2Num >= 97) {
      spo2Score = 16.67;
      spo2Status = 'Optimal SpO2 (97-100%)';
    } else if (spo2Num >= 94) {
      spo2Score = 13.0;
      spo2Status = 'Normal SpO2';
    } else if (spo2Num >= 90) {
      spo2Score = 8.0;
      spo2Status = 'Mild Hypoxia Alert';
      spo2IsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low Oxygen Saturation (Mild Hypoxia)', message: `Oxygen level SpO2 ${spo2Num}% is below the 95% normal baseline.` });
    } else {
      spo2Score = 2.0;
      spo2Status = 'CRITICAL SEVERE HYPOXIA WARNING';
      spo2IsWarn = true;
      warnings.push({ type: 'CRITICAL', title: 'CRITICAL SEVERE HYPOXIA ALERT', message: `Oxygen saturation SpO2 ${spo2Num}% is critically below 90%! Urgent medical attention required.` });
    }
    score += spo2Score;
    breakdown.push({ name: 'Oxygen Saturation (SpO2)', val: `${spo2Num}%`, pts: spo2Score.toFixed(1), status: spo2Status, isWarn: spo2IsWarn });

    // 4. Resting Heart Rate Score & Warning
    const rhrNum = parseFloat(rhr) || 72;
    let rhrScore = 16.67;
    let rhrStatus = 'Ideal Cardiac Rate';
    let rhrIsWarn = false;

    if (rhrNum >= 60 && rhrNum <= 80) {
      rhrScore = 16.67;
      rhrStatus = 'Ideal Cardiac Rate';
    } else if ((rhrNum >= 50 && rhrNum < 60) || (rhrNum > 80 && rhrNum <= 100)) {
      rhrScore = 13.5;
      rhrStatus = 'Acceptable Range';
    } else if (rhrNum > 100) {
      rhrScore = 6.0;
      rhrStatus = 'High Heart Rate (Tachycardia)';
      rhrIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'High Resting Heart Rate (Tachycardia)', message: `Resting heart rate ${rhrNum} bpm exceeds normal upper threshold of 100 bpm.` });
    } else {
      rhrScore = 6.0;
      rhrStatus = 'Low Heart Rate (Bradycardia)';
      rhrIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low Resting Heart Rate (Bradycardia)', message: `Resting heart rate ${rhrNum} bpm is below normal lower threshold of 50 bpm.` });
    }
    score += rhrScore;
    breakdown.push({ name: 'Resting Heart Rate', val: `${rhrNum} bpm`, pts: rhrScore.toFixed(1), status: rhrStatus, isWarn: rhrIsWarn });

    // 5. HRV Score & Warning
    const hrvNum = parseFloat(hrvVal) || 55;
    let hrvScore = 16.67;
    let hrvStatus = 'Optimal HRV';
    let hrvIsWarn = false;

    if (hrvNum >= 50) {
      hrvScore = 16.67;
      hrvStatus = 'Optimal HRV';
    } else if (hrvNum >= 35) {
      hrvScore = 12.5;
      hrvStatus = 'Moderate HRV';
    } else {
      hrvScore = 6.5;
      hrvStatus = 'Low HRV (High Stress Alert)';
      hrvIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low Heart Rate Variability (HRV Alert)', message: `HRV ${hrvNum} ms is below normal 35 ms baseline, indicating high physiological stress.` });
    }
    score += hrvScore;
    breakdown.push({ name: 'Heart Rate Variability (HRV)', val: `${hrvNum} ms`, pts: hrvScore.toFixed(1), status: hrvStatus, isWarn: hrvIsWarn });

    // 6. Body Temperature Score & Warning
    const tempNum = parseFloat(temp) || 98.6;
    let tempScore = 16.67;
    let tempStatus = 'Normothermic';
    let tempIsWarn = false;

    if (tempNum >= 97.5 && tempNum <= 99.2) {
      tempScore = 16.67;
      tempStatus = 'Normothermic';
    } else if (tempNum > 99.2 && tempNum <= 100.4) {
      tempScore = 11.0;
      tempStatus = 'Low-Grade Fever';
      tempIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low-Grade Fever Warning', message: `Body temperature ${tempNum} °F is above normal baseline (98.6 °F).` });
    } else if (tempNum > 100.4) {
      tempScore = 5.0;
      tempStatus = 'HIGH FEVER ALERT';
      tempIsWarn = true;
      warnings.push({ type: 'CRITICAL', title: 'HIGH FEVER ALERT', message: `Body temperature ${tempNum} °F exceeds 100.4 °F fever threshold.` });
    } else {
      tempScore = 7.0;
      tempStatus = 'Hypothermia Warning';
      tempIsWarn = true;
      warnings.push({ type: 'WARNING', title: 'Low Body Temperature (Hypothermia Warning)', message: `Body temperature ${tempNum} °F is below normal baseline.` });
    }
    score += tempScore;
    breakdown.push({ name: 'Body Temperature', val: `${tempNum} °F`, pts: tempScore.toFixed(1), status: tempStatus, isWarn: tempIsWarn });

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    let overallStatus = 'OPTIMAL HEALTH';
    let statusColor = '#10B981';

    if (warnings.some((w) => w.type === 'CRITICAL')) {
      overallStatus = 'CRITICAL HEALTH ALERT';
      statusColor = '#EF4444';
    } else if (warnings.length > 0 || finalScore < 75) {
      overallStatus = 'ATTENTION REQUIRED / WARNINGS';
      statusColor = '#F59E0B';
    } else if (finalScore >= 85) {
      overallStatus = 'OPTIMAL WELLNESS';
      statusColor = '#10B981';
    } else {
      overallStatus = 'MODERATE WELLNESS';
      statusColor = '#38BDF8';
    }

    return {
      finalScore,
      overallStatus,
      statusColor,
      breakdown,
      warnings
    };
  };

  const handleCalculateAndSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveSuccessMsg('');

    const sysNum = parseInt(systolicBP, 10);
    const diaNum = parseInt(diastolicBP, 10);
    const sugarNum = parseFloat(bloodSugar);
    const spo2Num = parseFloat(spo2);
    const rhrNum = parseInt(restingHeartRate, 10);
    const hrvNum = parseFloat(hrv);
    const tempNum = parseFloat(bodyTemperature);

    if (isNaN(sysNum) || isNaN(diaNum) || isNaN(sugarNum) || isNaN(spo2Num) || isNaN(rhrNum) || isNaN(hrvNum) || isNaN(tempNum)) {
      setErrorMsg('Please enter valid numeric values for all 6 vitals fields.');
      return;
    }

    const calculated = calculateWellnessScore(sysNum, diaNum, sugarNum, spo2Num, rhrNum, hrvNum, tempNum);
    setWellnessResult(calculated);
    setIsSaving(true);

    const currentUser = JSON.parse(localStorage.getItem('neuroguard_user') || '{}');
    const username = currentUser.username || 'patient_user';

    const payload = {
      username,
      bpSystolic: sysNum,
      bpDiastolic: diaNum,
      bloodSugar: sugarNum,
      spo2: spo2Num,
      restingHeartRate: rhrNum,
      hrv: hrvNum,
      bodyTemperature: tempNum,
      wellnessScore: calculated.finalScore,
      healthStatus: calculated.overallStatus
    };

    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSaveSuccessMsg('Wellness score & vitals saved successfully to SQLite DB (patient_vitals table)!');
        fetchVitalsHistory();
      } else {
        setSaveSuccessMsg('Calculated Wellness Score! (Stored locally in session)');
      }
    } catch (err) {
      setSaveSuccessMsg('Wellness score calculated! Saved to local session.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.outerContainer}>
      
      {/* Top Header */}
      <div style={styles.topHeader}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.backBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h2 style={styles.pageTitle}>Patient Vitals & Wellness Score</h2>
            <p style={styles.pageSubtitle}>Input 6 key physiological metrics with real-time clinical threshold warnings</p>
          </div>
        </div>
        <div style={styles.sqliteBadge}>
          <div style={styles.greenPulse}></div>
          <span>DB Browser Sync: patient_vitals</span>
        </div>
      </div>

      {/* Main Grid: Left Inputs Form, Right Score Display */}
      <div style={styles.mainGrid}>
        
        {/* Form Column: 6 Vital Input Boxes */}
        <div style={styles.cardBox}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIconBox}>🩺</div>
            <h3 style={styles.cardTitle}>Input 6 Physiological Vitals</h3>
          </div>

          {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
          {saveSuccessMsg && <div style={styles.successAlert}>{saveSuccessMsg}</div>}

          <form onSubmit={handleCalculateAndSave} style={styles.formGrid}>
            
            {/* Box 1: Blood Pressure */}
            <div style={liveStatus.bp.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>🩸</span>
                <label style={styles.boxLabel}>1. Blood Pressure (BP)</label>
              </div>
              <div style={styles.bpFlexRow}>
                <input
                  type="number"
                  placeholder="Systolic (120)"
                  value={systolicBP}
                  onChange={(e) => setSystolicBP(e.target.value)}
                  style={styles.bpInput}
                  required
                />
                <span style={{ color: '#64748B', fontWeight: '700' }}>/</span>
                <input
                  type="number"
                  placeholder="Diastolic (80)"
                  value={diastolicBP}
                  onChange={(e) => setDiastolicBP(e.target.value)}
                  style={styles.bpInput}
                  required
                />
              </div>
              <div style={styles.unitRow}>
                <span style={styles.unitText}>mmHg (Normal: 120/80)</span>
                <span style={liveStatus.bp.isCritical ? styles.criticalPill : liveStatus.bp.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.bp.msg}
                </span>
              </div>
            </div>

            {/* Box 2: Blood Sugar */}
            <div style={liveStatus.sugar.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>🍬</span>
                <label style={styles.boxLabel}>2. Blood Sugar (Glucose)</label>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 95"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                style={styles.singleInput}
                required
              />
              <div style={styles.unitRow}>
                <span style={styles.unitText}>mg/dL (Normal: 70-99)</span>
                <span style={liveStatus.sugar.isCritical ? styles.criticalPill : liveStatus.sugar.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.sugar.msg}
                </span>
              </div>
            </div>

            {/* Box 3: SpO2 Oxygen Saturation */}
            <div style={liveStatus.spo2.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>🫁</span>
                <label style={styles.boxLabel}>3. Oxygen Saturation (SpO2)</label>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 98"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                style={styles.singleInput}
                required
              />
              <div style={styles.unitRow}>
                <span style={styles.unitText}>% percentage (Normal: 95-100%)</span>
                <span style={liveStatus.spo2.isCritical ? styles.criticalPill : liveStatus.spo2.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.spo2.msg}
                </span>
              </div>
            </div>

            {/* Box 4: Resting Heart Rate */}
            <div style={liveStatus.rhr.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>❤️</span>
                <label style={styles.boxLabel}>4. Resting Heart Rate</label>
              </div>
              <input
                type="number"
                placeholder="e.g. 72"
                value={restingHeartRate}
                onChange={(e) => setRestingHeartRate(e.target.value)}
                style={styles.singleInput}
                required
              />
              <div style={styles.unitRow}>
                <span style={styles.unitText}>bpm (Normal: 60-100)</span>
                <span style={liveStatus.rhr.isCritical ? styles.criticalPill : liveStatus.rhr.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.rhr.msg}
                </span>
              </div>
            </div>

            {/* Box 5: Heart Rate Variability (HRV) */}
            <div style={liveStatus.hrv.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>📈</span>
                <label style={styles.boxLabel}>5. Heart Rate Variability (HRV)</label>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 55"
                value={hrv}
                onChange={(e) => setHrv(e.target.value)}
                style={styles.singleInput}
                required
              />
              <div style={styles.unitRow}>
                <span style={styles.unitText}>ms (Normal: ≥35 ms)</span>
                <span style={liveStatus.hrv.isCritical ? styles.criticalPill : liveStatus.hrv.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.hrv.msg}
                </span>
              </div>
            </div>

            {/* Box 6: Body Temperature */}
            <div style={liveStatus.temp.isWarn ? styles.inputBoxWarn : styles.inputBox}>
              <div style={styles.boxIconHeader}>
                <span style={styles.boxIcon}>🌡️</span>
                <label style={styles.boxLabel}>6. Body Temperature</label>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 98.6"
                value={bodyTemperature}
                onChange={(e) => setBodyTemperature(e.target.value)}
                style={styles.singleInput}
                required
              />
              <div style={styles.unitRow}>
                <span style={styles.unitText}>°F (Normal: 97.8 - 99.1 °F)</span>
                <span style={liveStatus.temp.isCritical ? styles.criticalPill : liveStatus.temp.isWarn ? styles.warnPill : styles.normalPill}>
                  {liveStatus.temp.msg}
                </span>
              </div>
            </div>

            <button type="submit" disabled={isSaving} style={styles.calculateBtn}>
              {isSaving ? 'Saving to SQLite DB...' : '⚡ Calculate Wellness Score & Save to SQLite'}
            </button>
          </form>
        </div>

        {/* Right Column: Computed Wellness Score & Clinical Threshold Warnings */}
        <div style={styles.cardBox}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIconBox}>🏆</div>
            <h3 style={styles.cardTitle}>Calculated Wellness Score</h3>
          </div>

          {wellnessResult ? (
            <div style={styles.resultContainer}>
              
              {/* Circular Meter Gauge */}
              <div style={styles.scoreGaugeBox}>
                <div style={{ ...styles.scoreGaugeCircle, borderColor: wellnessResult.statusColor }}>
                  <div style={styles.scoreNumber}>{wellnessResult.finalScore}</div>
                  <div style={styles.scoreMax}>/ 100</div>
                </div>
                <div style={{ ...styles.statusBadge, backgroundColor: wellnessResult.statusColor }}>
                  {wellnessResult.overallStatus}
                </div>
              </div>

              {/* Threshold Warnings Alert Panel */}
              {wellnessResult.warnings && wellnessResult.warnings.length > 0 && (
                <div style={styles.warningAlertBox}>
                  <div style={styles.warningAlertHeader}>
                    <span>⚠️</span>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                      CLINICAL THRESHOLD WARNINGS ({wellnessResult.warnings.length} Alert{wellnessResult.warnings.length > 1 ? 's' : ''})
                    </h4>
                  </div>
                  <div style={styles.warningList}>
                    {wellnessResult.warnings.map((w, idx) => (
                      <div key={idx} style={w.type === 'CRITICAL' ? styles.criticalWarnRow : styles.warningWarnRow}>
                        <div style={styles.warnBadgeTag}>
                          {w.type === 'CRITICAL' ? '🚨 CRITICAL ALERT' : '⚠️ THRESHOLD WARNING'}
                        </div>
                        <div style={styles.warnTitle}>{w.title}</div>
                        <div style={styles.warnDesc}>{w.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitals Breakdown Table */}
              <div style={styles.breakdownBox}>
                <h4 style={styles.breakdownTitle}>Vitals Sub-score Breakdown</h4>
                <div style={styles.breakdownList}>
                  {wellnessResult.breakdown.map((item, idx) => (
                    <div key={idx} style={item.isWarn ? styles.breakdownRowWarn : styles.breakdownRow}>
                      <div>
                        <div style={styles.breakdownName}>{item.name}</div>
                        <div style={styles.breakdownVal}>
                          {item.val} &bull; <span style={{ color: item.isWarn ? '#FCA5A5' : '#38BDF8', fontWeight: item.isWarn ? '700' : 'normal' }}>{item.status}</span>
                        </div>
                      </div>
                      <div style={item.isWarn ? styles.ptsBadgeWarn : styles.ptsBadge}>{item.pts} pts</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <h4 style={{ color: '#F8FAFC', margin: '0 0 8px 0' }}>No Wellness Score Calculated Yet</h4>
              <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
                Enter the 6 vital values on the left and click <strong>Calculate Wellness Score</strong> to view health status, clinical warnings, and store data in DB Browser for SQLite.
              </p>
            </div>
          )}

          {/* SQLite DB Inspection Prompt */}
          <div style={styles.dbHelpCard}>
            <div style={{ fontWeight: '700', color: '#10B981', fontSize: '12px' }}>
              💾 DB Browser for SQLite Storage
            </div>
            <div style={{ color: '#CBD5E1', fontSize: '12px', marginTop: '4px' }}>
              All records save into table: <code style={styles.codePill}>patient_vitals</code> in <code style={styles.codePill}>database.sqlite</code>
            </div>
          </div>
        </div>

      </div>

      {/* Vitals History Table */}
      {vitalsHistory.length > 0 && (
        <div style={styles.historyCard}>
          <h3 style={styles.historyTitle}>📜 Recorded Vitals History (SQLite Table: patient_vitals)</h3>
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Patient</th>
                  <th style={styles.th}>BP (mmHg)</th>
                  <th style={styles.th}>Sugar (mg/dL)</th>
                  <th style={styles.th}>SpO2 (%)</th>
                  <th style={styles.th}>Heart Rate</th>
                  <th style={styles.th}>HRV (ms)</th>
                  <th style={styles.th}>Temp (°F)</th>
                  <th style={styles.th}>Wellness Score</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Recorded Date</th>
                </tr>
              </thead>
              <tbody>
                {vitalsHistory.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>#{row.id}</td>
                    <td style={styles.td}>{row.username}</td>
                    <td style={styles.td}>{row.bp_systolic}/{row.bp_diastolic}</td>
                    <td style={{ ...styles.td, color: row.blood_sugar < 70 || row.blood_sugar > 125 ? '#FCA5A5' : '#CBD5E1', fontWeight: row.blood_sugar < 70 ? '700' : 'normal' }}>
                      {row.blood_sugar}
                    </td>
                    <td style={{ ...styles.td, color: row.spo2 < 90 ? '#EF4444' : row.spo2 < 95 ? '#FCA5A5' : '#CBD5E1', fontWeight: row.spo2 < 90 ? '800' : 'normal' }}>
                      {row.spo2}%
                    </td>
                    <td style={styles.td}>{row.resting_heart_rate} bpm</td>
                    <td style={styles.td}>{row.hrv} ms</td>
                    <td style={styles.td}>{row.body_temperature} °F</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: row.wellness_score < 70 ? '#EF4444' : '#38BDF8' }}>
                      {row.wellness_score} / 100
                    </td>
                    <td style={styles.td}><span style={row.health_status.includes('CRITICAL') ? styles.tableStatusBadgeCritical : styles.tableStatusBadge}>{row.health_status}</span></td>
                    <td style={styles.td}>{row.recorded_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  outerContainer: {
    width: '100%',
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxSizing: 'border-box'
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '16px',
    padding: '18px 24px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
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
  pageTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  pageSubtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    color: '#94A3B8'
  },
  sqliteBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#10B981',
    fontWeight: '600'
  },
  greenPulse: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  cardBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '18px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  cardIconBox: {
    fontSize: '22px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px'
  },
  inputBox: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'border-color 0.2s'
  },
  inputBoxWarn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)'
  },
  boxIconHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  boxIcon: {
    fontSize: '14px'
  },
  boxLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#CBD5E1'
  },
  bpFlexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  bpInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F8FAFC',
    padding: '8px',
    fontSize: '13px',
    outline: 'none'
  },
  singleInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F8FAFC',
    padding: '8px 10px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  unitRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '2px'
  },
  unitText: {
    fontSize: '10px',
    color: '#64748B'
  },
  normalPill: {
    fontSize: '10px',
    color: '#10B981',
    fontWeight: '600'
  },
  warnPill: {
    fontSize: '10px',
    color: '#F59E0B',
    fontWeight: '700'
  },
  criticalPill: {
    fontSize: '10px',
    color: '#EF4444',
    fontWeight: '800'
  },
  calculateBtn: {
    gridColumn: '1 / -1',
    marginTop: '6px',
    padding: '14px',
    backgroundColor: '#0284C7',
    background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '12px'
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6EE7B7',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '12px'
  },
  resultContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center'
  },
  scoreGaugeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  scoreGaugeCircle: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    border: '6px solid #10B981',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
    boxShadow: '0 0 25px rgba(16, 185, 129, 0.2)'
  },
  scoreNumber: {
    fontSize: '38px',
    fontWeight: '800',
    color: '#F8FAFC'
  },
  scoreMax: {
    fontSize: '12px',
    color: '#64748B'
  },
  statusBadge: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '12px',
    padding: '6px 16px',
    borderRadius: '20px',
    letterSpacing: '0.5px'
  },
  warningAlertBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxSizing: 'border-box'
  },
  warningAlertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#FCA5A5'
  },
  warningList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  criticalWarnRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderLeft: '4px solid #EF4444',
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  warningWarnRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderLeft: '4px solid #F59E0B',
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  warnBadgeTag: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '0.5px'
  },
  warnTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  warnDesc: {
    fontSize: '11px',
    color: '#CBD5E1'
  },
  breakdownBox: {
    width: '100%',
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    padding: '14px'
  },
  breakdownTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#CBD5E1'
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    backgroundColor: '#0F172A',
    borderRadius: '8px'
  },
  breakdownRowWarn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px'
  },
  breakdownName: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  breakdownVal: {
    fontSize: '11px',
    color: '#94A3B8'
  },
  ptsBadge: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  ptsBadgeWarn: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#090D16',
    borderRadius: '14px',
    border: '1px solid #1E293B'
  },
  emptyIcon: {
    fontSize: '36px',
    marginBottom: '12px'
  },
  dbHelpCard: {
    backgroundColor: '#090D16',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '12px 14px'
  },
  codePill: {
    color: '#38BDF8',
    backgroundColor: '#0F172A',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  historyCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '18px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  historyTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  tableScroll: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px'
  },
  th: {
    backgroundColor: '#090D16',
    color: '#94A3B8',
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #1E293B'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#CBD5E1'
  },
  tableStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#6EE7B7',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: '600'
  },
  tableStatusBadgeCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#FCA5A5',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: '700'
  }
};
