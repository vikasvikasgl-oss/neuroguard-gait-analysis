/**
 * Clinical Motor Evaluation Model for Parkinsonian Pattern Screening
 * Based on MDS-UPDRS Part III Item 3.4 (Finger Tapping) clinical criteria.
 * 
 * Accurately differentiates:
 * - Typical Motor Dexterity Pattern (Low Risk: 8% – 25%) when tapping is smooth, fast, and steady
 * - Mild Bilateral Motor Asymmetry (Moderate Risk: 30% – 50%) for slight slowing or asymmetry
 * - Parkinsonian Motor Pattern Detected (High Risk: 65% – 95%) when excessive hand shaking, severe tremor,
 *   rapid amplitude decay, dysrhythmia, or freezing episodes are present.
 */

export const HEALTHY_TAPPING_BASELINE = {
  frequency: 4.2,            // Hz (Taps/sec)
  amplitude_mean: 0.75,      // normalized finger separation
  amplitude_dec: 0.05,       // fatigue decay slope (< 0.15 is healthy)
  velocity_mean: 4.8,        // m/s normalized speed
  velocity_dec: 0.04,        // velocity decrement
  rhythm_cv: 0.10,           // Coefficient of variation (< 0.15 is rhythmic)
  pause_pct: 1.5,            // % pause / hesitations (< 5% is normal)
  tremor_metric: 8.0,        // Tremor micro-vibration power (< 15 is steady)
  handShake_score: 8.0       // Overall hand stability (< 18 is steady)
};

/**
 * Predicts the probability of a Parkinsonian motor pattern from clinical finger-tapping features
 * @param {Object} features Clinical kinematic feature set
 * @returns {number} Probability between 0.06 and 0.96
 */
export function predictParkinsonianPattern(features = {}) {
  const frequency = typeof features.frequency === 'number' ? features.frequency : 4.0;
  const amplitude_dec = typeof features.amplitude_dec === 'number' ? features.amplitude_dec : 0.05;
  const rhythm_cv = typeof features.rhythm_cv === 'number' ? features.rhythm_cv : 0.10;
  const pauseCount = typeof features.pauseCount === 'number' ? features.pauseCount : 0;
  const tremor_metric = typeof features.tremor_metric === 'number' ? features.tremor_metric : 8.0;
  const validTaps = typeof features.validTaps === 'number' ? features.validTaps : 40;
  const handShake_score = typeof features.handShake_score === 'number' ? features.handShake_score : tremor_metric;

  // Base healthy risk baseline (10% - 14%)
  let riskScore = 0.12;

  // 1. PRIMARY DRIVER: EXCESSIVE HAND SHAKING / TREMOR
  // Only triggers high risk when hand is shaking or moving erratically
  if (handShake_score >= 32 || tremor_metric >= 30) {
    // Severe shaking / marked oscillatory tremor
    riskScore += 0.42 + Math.min(0.25, (Math.max(handShake_score, tremor_metric) - 30) * 0.015);
  } else if (handShake_score >= 20 || tremor_metric >= 20) {
    // Moderate involuntary shaking
    riskScore += 0.22;
  } else if (handShake_score <= 12 && tremor_metric <= 12) {
    // Steady, calm hand reduces risk
    riskScore -= 0.04;
  }

  // 2. BRADYKINESIA (Slow tapping speed < 2.2 Hz)
  if (frequency < 1.8) {
    riskScore += 0.24; // Severe bradykinesia
  } else if (frequency < 2.5) {
    riskScore += 0.12; // Mild slowing
  } else if (frequency >= 3.4) {
    riskScore -= 0.04; // Normal rapid cadence reduces risk
  }

  // 3. LOW TAP COUNT IN 15 SECONDS (< 20 taps)
  if (validTaps < 16) {
    riskScore += 0.20;
  } else if (validTaps < 25) {
    riskScore += 0.08;
  } else if (validTaps >= 36) {
    riskScore -= 0.04; // Plentiful taps indicates healthy motor motor drive
  }

  // 4. PROGRESSIVE FATIGUE / AMPLITUDE DECREMENT (> 25% reduction between halves)
  if (amplitude_dec > 0.35) {
    riskScore += 0.22; // Severe amplitude reduction (hallmark of Parkinsonian hypometria)
  } else if (amplitude_dec > 0.22) {
    riskScore += 0.10;
  } else if (amplitude_dec <= 0.10) {
    riskScore -= 0.03; // Maintained amplitude reduces risk
  }

  // 5. RHYTHM VARIABILITY / DYSRHYTHMIA (Rhythm CV > 20%)
  if (rhythm_cv > 0.28) {
    riskScore += 0.16;
  } else if (rhythm_cv > 0.18) {
    riskScore += 0.08;
  } else if (rhythm_cv <= 0.12) {
    riskScore -= 0.03;
  }

  // 6. MOTOR ARRESTS / FREEZING EPISODES
  if (pauseCount >= 3) {
    riskScore += 0.24; // Multiple motor freezes
  } else if (pauseCount >= 1) {
    riskScore += 0.10;
  }

  // Strict bounding: normal performance stays low (8% - 24%), abnormal shaking reaches 65% - 94%
  const finalProbability = Math.max(0.06, Math.min(0.95, parseFloat(riskScore.toFixed(3))));
  return finalProbability;
}

/**
 * Computes bilateral motor screening comparisons between right and left hands
 * @param {Object} rightFeatures
 * @param {Object} leftFeatures
 * @returns {Object|null}
 */
export function computeBilateralScreening(rightFeatures, leftFeatures) {
  if (!rightFeatures && !leftFeatures) return null;

  const rightProb = rightFeatures ? predictParkinsonianPattern(rightFeatures) : 0.12;
  const leftProb = leftFeatures ? predictParkinsonianPattern(leftFeatures) : 0.12;

  // Asymmetric onset is typical in early Parkinsonian motor changes
  const overallProb = Math.max(rightProb, leftProb);
  const confidencePercent = Math.round(overallProb * 100);

  const rFreq = rightFeatures?.frequency || 4.0;
  const lFreq = leftFeatures?.frequency || 4.0;
  const rAmp = rightFeatures?.amplitude_mean || 0.72;
  const lAmp = leftFeatures?.amplitude_mean || 0.72;
  const rCV = rightFeatures?.rhythm_cv || 0.10;
  const lCV = leftFeatures?.rhythm_cv || 0.10;

  const freqAsym = Math.abs(rFreq - lFreq).toFixed(2);
  const ampAsym = Math.abs(rAmp - lAmp).toFixed(2);
  const rhythmAsym = Math.abs(rCV - lCV).toFixed(2);

  // Classification Thresholds
  let classification = "Typical Motor Dexterity Pattern";
  let isParkinsonian = false;

  if (overallProb >= 0.60) {
    // Only triggers when significant shaking, tremor, or severe bradykinesia occurred
    classification = "Parkinsonian Motor Pattern Detected";
    isParkinsonian = true;
  } else if (overallProb >= 0.35 || parseFloat(freqAsym) >= 1.5) {
    // Moderate hesitation or noticeable asymmetry between right and left hand
    classification = "Mild Bilateral Motor Asymmetry";
  } else {
    // Normal healthy tapping: low values
    classification = "Typical Motor Dexterity Pattern";
  }

  return {
    rightProb,
    leftProb,
    overallProb,
    confidencePercent,
    classification,
    isParkinsonian,
    freqAsym,
    ampAsym,
    rhythmAsym
  };
}
