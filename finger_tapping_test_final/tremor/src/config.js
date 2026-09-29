export const CONFIG = {
  // Analysis settings
  RECORDING_DURATION_SEC: 10,
  TARGET_FPS: 30,
  MIN_REQUIRED_FRAMES: 100,

  // Decision Thresholds
  TREMOR_SCORE_THRESHOLD: 50, // Score >= 50 triggers TREMOR: YES

  // Frequency Analysis (Hz)
  BANDPASS_LOW: 2.5,          // Low cutoff to eliminate posture sway/breathing (<2 Hz)
  BANDPASS_HIGH: 12.0,        // High cutoff for physiological & pathological tremor window
  TARGET_FREQ_MIN: 3.5,       // Lower bound for Parkinsonian/Essential resting tremor (Hz)
  TARGET_FREQ_MAX: 7.5,       // Upper bound for typical resting facial tremor (Hz)
  PHYSIOLOGICAL_FREQ_MAX: 11.0, // Physiological tremor upper bound (Hz)

  // Amplitude & SNR Thresholds
  MIN_AMPLITUDE_FLOOR: 0.0008, // Micro-jitter noise floor (normalized to face width)
  MIN_SNR_THRESHOLD: 2.5,      // Spectral peak prominence ratio threshold

  // Head Motion Safety Gate
  MAX_ALLOWED_HEAD_MOTION: 0.12, // Head translation stdev threshold for excessive motion

  // Face Geometry Quality Checks
  MIN_FACE_WIDTH_RATIO: 0.15, // Face width must occupy at least 15% of frame width

  // Regional Weights for Overall Score
  REGIONAL_WEIGHTS: {
    perioral: 0.35,  // Lips / perioral (Rabbit syndrome / Parkinsonian perioral tremor)
    chin: 0.25,      // Mentalis muscle
    eyelids: 0.20,   // Ocular / Blepharospasm / myokymia
    eyebrows: 0.10,  // Frontalis
    jaw: 0.10,       // Mandibular tremor
  },
};