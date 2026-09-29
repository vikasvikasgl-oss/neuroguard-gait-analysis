import React, { useRef, useEffect } from 'react';

export default function LiveWaveform({ dataPoints = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth || 300);
    const height = (canvas.height = 42);

    ctx.clearRect(0, 0, width, height);

    // Center reference line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (dataPoints.length < 2) return;

    const maxPoints = 120;
    const slice = dataPoints.slice(-maxPoints);
    const step = width / (maxPoints - 1);

    // Waveform stroke
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    slice.forEach((val, idx) => {
      const x = idx * step;
      const y = height / 2 - Math.max(-18, Math.min(18, val * 320));
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [dataPoints]);

  return (
    <div
      style={{
        width: '100%',
        height: '42px',
        backgroundColor: '#0F172A',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #1E293B',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
