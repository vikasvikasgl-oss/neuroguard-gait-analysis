import React, { useRef, useEffect } from 'react';

export default function SpectrumChart({ spectrumData, dominantFrequency, title = 'Power Spectral Density' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrumData || !spectrumData.freqs || spectrumData.freqs.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth || 500);
    const height = (canvas.height = 170);

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const { freqs, powers } = spectrumData;
    const maxPower = Math.max(...powers, 0.0001);
    const maxFreq = Math.max(...freqs, 14.0);

    const getX = (f) => padding.left + (f / maxFreq) * chartW;
    const getY = (p) => padding.top + chartH - (p / maxPower) * chartH;

    // 1. Subtle Highlight for Target Tremor Band (3.5 - 7.5 Hz)
    const bandXStart = getX(3.5);
    const bandXEnd = getX(7.5);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(bandXStart, padding.top, bandXEnd - bandXStart, chartH);

    // Target band subtle label
    ctx.fillStyle = '#64748B';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Target Tremor Band (3.5 - 7.5 Hz)', (bandXStart + bandXEnd) / 2, padding.top - 6);

    // 2. Gridlines & Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748B';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    for (let f = 0; f <= maxFreq; f += 2) {
      const x = getX(f);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();

      ctx.fillText(`${f} Hz`, x, height - padding.bottom + 16);
    }

    // 3. Spectrum Curve with Soft Gradient
    const curveGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    curveGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    curveGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(freqs[0]), getY(powers[0]));
    for (let i = 1; i < freqs.length; i++) {
      const prevX = getX(freqs[i - 1]);
      const prevY = getY(powers[i - 1]);
      const currX = getX(freqs[i]);
      const currY = getY(powers[i]);
      const midX = (prevX + currX) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + currY) / 2);
    }
    ctx.lineTo(getX(freqs[freqs.length - 1]), getY(powers[powers.length - 1]));
    ctx.lineTo(getX(freqs[freqs.length - 1]), padding.top + chartH);
    ctx.lineTo(getX(freqs[0]), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = curveGrad;
    ctx.fill();

    // Curve outline stroke
    ctx.beginPath();
    ctx.moveTo(getX(freqs[0]), getY(powers[0]));
    for (let i = 1; i < freqs.length; i++) {
      const prevX = getX(freqs[i - 1]);
      const prevY = getY(powers[i - 1]);
      const currX = getX(freqs[i]);
      const currY = getY(powers[i]);
      const midX = (prevX + currX) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + currY) / 2);
    }
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Dominant Peak Marker
    if (dominantFrequency && dominantFrequency >= 1.0) {
      const peakX = getX(dominantFrequency);
      let pVal = 0;
      for (let i = 0; i < freqs.length; i++) {
        if (Math.abs(freqs[i] - dominantFrequency) < 0.25) {
          pVal = Math.max(pVal, powers[i]);
        }
      }
      const peakY = getY(pVal || maxPower * 0.85);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(peakX, padding.top);
      ctx.lineTo(peakX, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Peak Label tag
      const tagText = `Peak: ${dominantFrequency} Hz`;
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(tagText).width;
      
      const tagBoxX = Math.min(width - padding.right - textWidth - 10, Math.max(padding.left + 4, peakX - textWidth / 2 - 4));
      const tagBoxY = Math.max(padding.top + 4, peakY - 24);

      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tagBoxX, tagBoxY, textWidth + 10, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.textAlign = 'left';
      ctx.fillText(tagText, tagBoxX + 5, tagBoxY + 13);
    }
  }, [spectrumData, dominantFrequency]);

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94A3B8' }}>
          {title}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
          0.5 – 14.0 Hz
        </span>
      </div>
      <div style={{ width: '100%', backgroundColor: '#0F172A', borderRadius: '8px', border: '1px solid #1E293B', overflow: 'hidden', padding: '4px 0' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '170px', display: 'block' }} />
      </div>
    </div>
  );
}
