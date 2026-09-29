# NeuroGuard - Gait & Neurological Motor Assessment System

NeuroGuard is an AI-assisted neurological screening and motor assessment application designed for early detection and tracking of motor symptoms associated with Parkinson's Disease and related movement disorders.

## Features

- **Finger Tapping Assessment**:
  - Live kinematic waveform tracking using MediaPipe Vision.
  - Frequency, amplitude, and rhythmicity analysis.
  - Automated scoring based on trained tapping kinematic models.

- **Tremor Detection**:
  - Real-time facial and extremity tremor tracking.
  - Fast Fourier Transform (FFT) spectrum analysis for tremor frequency peak detection.

- **Gait Analysis**:
  - Full-body skeleton tracking and joint kinematic angle calculation.
  - Stride symmetry, cadence, velocity, and gait irregularity detection.
  - Preloaded sample test video verification mode.

- **Comprehensive Motor & Cognitive Battery**:
  - Sit-to-Stand Test
  - Postural Stability Test
  - Toe Tapping Test
  - Spiral Drawing Test
  - Clock Drawing Test
  - Attention & Memory screening

## Tech Stack

- **Frontend**: React 18, Vite
- **Computer Vision & ML**: MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- **Signal Processing**: Custom FFT & kinematic analysis utilities
- **Styling**: Modern dark-mode responsive UI

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vikasvikasgl-oss/neuroguard-gait-analysis_7sem.git
   cd neuroguard-gait-analysis_7sem
   ```

2. Install dependencies:
   ```bash
   cd finger_tapping_test_final/tremor
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.
