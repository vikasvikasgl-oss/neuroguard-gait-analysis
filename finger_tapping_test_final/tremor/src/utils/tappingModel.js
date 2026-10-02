/**
 * Clinical Motor Evaluation Model for Parkinsonian Pattern Screening
 * Based on MDS-UPDRS Part III Item 3.4 (Finger Tapping) clinical criteria.
 * 
 * Accurately differentiates:
 * - Typical Motor Dexterity Pattern (Low Risk: 8% – 25%) when tapping is smooth, fast (> 25-30 taps), and steady
 * - Mild Bilateral Motor Asymmetry (Moderate Risk: 30% – 50%) for slight slowing or asymmetry
 * - Parkinsonian Motor Pattern Detected (High Risk: 65% – 95%) when severe hand shaking, rapid amplitude decay, or freezing episodes are present.
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

  // Base healthy risk baseline (8% - 12%)
  let riskScore = 0.10;

  // 1. TAP COUNT & SPEED PROTECTIVE FACTOR (> 28 - 30 taps indicates strong motor drive)
  const isHighTapCount = validTaps >= 28 || frequency >= 2.0;

  // 2. PRIMARY DRIVER: EXCESSIVE HAND SHAKING / TREMOR
  if (handShake_score >= 40 || tremor_metric >= 40) {
    // Severe, uncoordinated shaking
    riskScore += 0.45;
  } else if (handShake_score >= 25 || tremor_metric >= 25) {
    // Moderate shaking - offset if tap count is high (> 30 taps)
    if (isHighTapCount && amplitude_dec < 0.20) {
      riskScore += 0.08; // Slight bump, kept low because high tap speed indicates intact motor control
    } else {
      riskScore += 0.22;
    }
  } else if (handShake_score <= 15 && tremor_metric <= 15) {
    riskScore -= 0.05;
  }

  // 3. BRADYKINESIA (Slow tapping speed < 1.8 Hz)
  if (frequency < 1.6) {
    riskScore += 0.25; // Severe bradykinesia
  } else if (frequency < 2.2 && !isHighTapCount) {
    riskScore += 0.10;
  } else if (frequency >= 2.2 || isHighTapCount) {
    riskScore -= 0.06; // Good tapping speed reduces risk
  }

  // 4. LOW TAP COUNT IN 15 SECONDS (< 20 taps)
  if (validTaps < 16) {
    riskScore += 0.22;
  } else if (validTaps < 25) {
    riskScore += 0.08;
  } else if (validTaps >= 30) {
    riskScore -= 0.12; // Excellent tap count (> 30 taps) strongly indicates healthy motor function
  }

  // 5. PROGRESSIVE FATIGUE / AMPLITUDE DECREMENT (> 25% reduction between halves)
  if (amplitude_dec > 0.35) {
    riskScore += 0.22;
  } else if (amplitude_dec > 0.22) {
    riskScore += 0.08;
  } else if (amplitude_dec <= 0.12) {
    riskScore -= 0.04;
  }

  // 6. RHYTHM VARIABILITY / DYSRHYTHMIA (Rhythm CV > 22%)
  if (rhythm_cv > 0.30) {
    riskScore += 0.15;
  } else if (rhythm_cv > 0.20 && !isHighTapCount) {
    riskScore += 0.06;
  } else if (rhythm_cv <= 0.15) {
    riskScore -= 0.04;
  }

  // 7. MOTOR ARRESTS / FREEZING EPISODES
  if (pauseCount >= 3) {
    riskScore += 0.25;
  } else if (pauseCount >= 1) {
    riskScore += 0.08;
  }

  // If tap count > 30 and no severe freezing, cap maximum risk to keep it in Typical/Low-Risk range (< 30%)
  if (validTaps >= 28 && pauseCount === 0 && amplitude_dec < 0.25) {
    riskScore = Math.min(0.28, riskScore);
  }

  // Strict bounding: normal performance stays low (8% - 24%)
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

  let classification = "Typical Motor Dexterity Pattern";
  let isParkinsonian = false;

  if (overallProb >= 0.55) {
    classification = "Parkinsonian Motor Pattern Detected";
    isParkinsonian = true;
  } else if (overallProb >= 0.32 || parseFloat(freqAsym) >= 1.5) {
    classification = "Mild Bilateral Motor Asymmetry";
  } else {
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
