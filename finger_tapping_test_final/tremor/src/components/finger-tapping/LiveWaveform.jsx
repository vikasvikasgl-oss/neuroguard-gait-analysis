import React, { useRef, useEffect } from 'react';

export default function LiveWaveform({ dataPoints = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    const height = (canvas.height = 48);

    ctx.clearRect(0, 0, width, height);

    // Subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();

    if (dataPoints.length < 2) return;

    const maxPoints = 120;
    const slice = dataPoints.slice(-maxPoints);
    const step = width / Math.max(1, slice.length - 1);

    // Dynamic wave gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#10B981');
    gradient.addColorStop(1, '#38BDF8');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const padding = 6;
    const drawHeight = height - padding * 2;

    ctx.beginPath();
    slice.forEach((val, idx) => {
      const x = idx * step;
      // Normalizing distance (0 = touch/closed at bottom, 1 = wide open at top)
      const norm = Math.max(0, Math.min(1.2, typeof val === 'number' ? val : 0)) / 1.2;
      const y = height - padding - norm * drawHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pulse dot at the latest signal point
    const lastVal = slice[slice.length - 1];
    const lastNorm = Math.max(0, Math.min(1.2, typeof lastVal === 'number' ? lastVal : 0)) / 1.2;
    const lastX = (slice.length - 1) * step;
    const lastY = height - padding - lastNorm * drawHeight;

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [dataPoints]);

  return (
    <div
      style={{
        width: '100%',
        height: '48px',
        backgroundColor: '#0A0F1D',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #1E293B',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
