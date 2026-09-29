import React, { useState } from 'react';

export default function GaitCharts({ chartsData }) {
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TRAJECTORY, TIMING, KNEE, SYMMETRY

  if (!chartsData) return null;

  const { trajectoryData, kneeAngleData, stepTimingData, symmetryComparisonData } = chartsData;

  return (
    <div style={styles.container}>
      {/* Chart Navigation Tabs */}
      <div style={styles.tabBar}>
        <div style={styles.tabGroup}>
          <button
            style={activeTab === 'ALL' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('ALL')}
          >
            All Charts (4)
          </button>
          <button
            style={activeTab === 'TRAJECTORY' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('TRAJECTORY')}
          >
            Foot Trajectory
          </button>
          <button
            style={activeTab === 'TIMING' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('TIMING')}
          >
            Step Timing
          </button>
          <button
            style={activeTab === 'KNEE' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('KNEE')}
          >
            Knee Angle
          </button>
          <button
            style={activeTab === 'SYMMETRY' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('SYMMETRY')}
          >
            Gait Symmetry
          </button>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {/* CHART 1: Foot Trajectory */}
        {(activeTab === 'ALL' || activeTab === 'TRAJECTORY') && (
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h4 style={styles.chartTitle}>Foot Trajectory (Vertical Displacement)</h4>
                <p style={styles.chartDesc}>Kinematic vertical elevation & foot clearance during swing/stance phases</p>
              </div>
              <div style={styles.legend}>
                <span style={{ ...styles.legendBadge, color: '#38BDF8', borderColor: '#0284C7' }}>Left Foot</span>
                <span style={{ ...styles.legendBadge, color: '#FB923C', borderColor: '#EA580C' }}>Right Foot</span>
              </div>
            </div>
            <FootTrajectoryChart data={trajectoryData} />
          </div>
        )}

        {/* CHART 2: Step Timing */}
        {(activeTab === 'ALL' || activeTab === 'TIMING') && (
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h4 style={styles.chartTitle}>Step Timing Distribution</h4>
                <p style={styles.chartDesc}>Duration of consecutive heel strikes to evaluate temporal rhythmicity</p>
              </div>
              <div style={styles.legend}>
                <span style={{ ...styles.legendBadge, color: '#38BDF8', borderColor: '#0284C7' }}>Left Lead</span>
                <span style={{ ...styles.legendBadge, color: '#FB923C', borderColor: '#EA580C' }}>Right Lead</span>
              </div>
            </div>
            <StepTimingChart data={stepTimingData} />
          </div>
        )}

        {/* CHART 3: Knee Angle Dynamics */}
        {(activeTab === 'ALL' || activeTab === 'KNEE') && (
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h4 style={styles.chartTitle}>Knee Angle Over Gait Cycle</h4>
                <p style={styles.chartDesc}>Degrees of knee flexion/extension (Hip-Knee-Ankle 3D angle)</p>
              </div>
              <div style={styles.legend}>
                <span style={{ ...styles.legendBadge, color: '#38BDF8', borderColor: '#0284C7' }}>Left Knee</span>
                <span style={{ ...styles.legendBadge, color: '#FB923C', borderColor: '#EA580C' }}>Right Knee</span>
                <span style={{ ...styles.legendBadge, color: '#10B981', borderColor: '#059669' }}>Ref Band</span>
              </div>
            </div>
            <KneeAngleChart data={kneeAngleData} />
          </div>
        )}

        {/* CHART 4: Left vs Right Gait Symmetry */}
        {(activeTab === 'ALL' || activeTab === 'SYMMETRY') && (
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h4 style={styles.chartTitle}>Left vs Right Bilateral Symmetry</h4>
                <p style={styles.chartDesc}>Bilateral parameter parity index across temporal and spatial domains</p>
              </div>
              <div style={styles.legend}>
                <span style={{ ...styles.legendBadge, color: '#38BDF8', borderColor: '#0284C7' }}>Left</span>
                <span style={{ ...styles.legendBadge, color: '#FB923C', borderColor: '#EA580C' }}>Right</span>
              </div>
            </div>
            <SymmetryComparisonChart data={symmetryComparisonData} />
          </div>
        )}
      </div>
    </div>
  );
}

// 1. Foot Trajectory SVG Chart
function FootTrajectoryChart({ data }) {
  if (!data || data.length === 0) return <div style={styles.noData}>No trajectory data points available.</div>;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const yVals = data.flatMap(d => [d.leftFootY, d.rightFootY]);
  const minY = Math.min(...yVals) * 0.95;
  const maxY = Math.max(...yVals) * 1.05 || 1;

  const scaleX = (idx) => padding.left + (idx / (data.length - 1)) * innerW;
  const scaleY = (val) => padding.top + innerH - ((val - minY) / (maxY - minY || 1)) * innerH;

  const leftPoints = data.map((d, i) => `${scaleX(i)},${scaleY(d.leftFootY)}`).join(' ');
  const rightPoints = data.map((d, i) => `${scaleX(i)},${scaleY(d.rightFootY)}`).join(' ');

  return (
    <div style={styles.svgContainer}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + innerH * pct;
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#1E293B"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Left Foot Line */}
        <polyline
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={leftPoints}
        />

        {/* Right Foot Line */}
        <polyline
          fill="none"
          stroke="#FB923C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={rightPoints}
        />

        {/* X and Y Axis labels */}
        <text x={padding.left} y={height - 8} fill="#64748B" fontSize="10">0.0s</text>
        <text x={width - padding.right - 25} y={height - 8} fill="#64748B" fontSize="10">
          {data[data.length - 1].time}s
        </text>
        <text x={12} y={padding.top + innerH / 2} fill="#64748B" fontSize="10" transform={`rotate(-90 12 ${padding.top + innerH / 2})`}>
          Elevation
        </text>
      </svg>
    </div>
  );
}

// 2. Step Timing Bar Chart
function StepTimingChart({ data }) {
  if (!data || data.length === 0) return <div style={styles.noData}>No step timing events detected.</div>;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxDuration = Math.max(...data.map(d => d.duration), 0.85);
  const barWidth = Math.min(32, innerW / (data.length * 1.5));

  return (
    <div style={styles.svgContainer}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        {/* Baseline normative reference line (0.58s) */}
        <line
          x1={padding.left}
          y1={padding.top + innerH - (0.58 / maxDuration) * innerH}
          x2={width - padding.right}
          y2={padding.top + innerH - (0.58 / maxDuration) * innerH}
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <text
          x={width - padding.right - 80}
          y={padding.top + innerH - (0.58 / maxDuration) * innerH - 6}
          fill="#10B981"
          fontSize="9"
          fontWeight="600"
        >
          Normative (0.58s)
        </text>

        {data.map((d, i) => {
          const stepX = padding.left + (i + 0.5) * (innerW / data.length);
          const barH = (d.duration / maxDuration) * innerH;
          const barY = padding.top + innerH - barH;
          const isLeft = d.side === 'Left';

          return (
            <g key={i}>
              <rect
                x={stepX - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barH}
                fill={isLeft ? 'rgba(56, 189, 248, 0.85)' : 'rgba(251, 146, 60, 0.85)'}
                rx="4"
              />
              <text
                x={stepX}
                y={barY - 6}
                fill="#F8FAFC"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {d.duration}s
              </text>
              <text
                x={stepX}
                y={height - 12}
                fill="#94A3B8"
                fontSize="10"
                textAnchor="middle"
              >
                S{i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 3. Knee Angle Chart
function KneeAngleChart({ data }) {
  if (!data || data.length === 0) return <div style={styles.noData}>No knee angle frames detected.</div>;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const minAngle = 100;
  const maxAngle = 180;

  const scaleX = (idx) => padding.left + (idx / (data.length - 1)) * innerW;
  const scaleY = (val) => padding.top + innerH - ((val - minAngle) / (maxAngle - minAngle)) * innerH;

  const leftPoints = data.map((d, i) => `${scaleX(i)},${scaleY(d.leftKnee)}`).join(' ');
  const rightPoints = data.map((d, i) => `${scaleX(i)},${scaleY(d.rightKnee)}`).join(' ');

  // Normal reference zone (130° to 175°)
  const refZoneTop = scaleY(175);
  const refZoneBottom = scaleY(130);

  return (
    <div style={styles.svgContainer}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        {/* Reference Zone */}
        <rect
          x={padding.left}
          y={refZoneTop}
          width={innerW}
          height={refZoneBottom - refZoneTop}
          fill="rgba(16, 185, 129, 0.08)"
          stroke="rgba(16, 185, 129, 0.25)"
          strokeDasharray="4 4"
        />

        {/* 140° & 160° Grid Lines */}
        {[120, 140, 160, 180].map((ang) => {
          const y = scaleY(ang);
          return (
            <g key={ang}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1E293B"
                strokeDasharray="3 3"
              />
              <text x={padding.left - 28} y={y + 3} fill="#64748B" fontSize="9">
                {ang}°
              </text>
            </g>
          );
        })}

        {/* Left Knee Curve */}
        <polyline
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={leftPoints}
        />

        {/* Right Knee Curve */}
        <polyline
          fill="none"
          stroke="#FB923C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={rightPoints}
        />

        <text x={padding.left} y={height - 8} fill="#64748B" fontSize="10">0.0s</text>
        <text x={width - padding.right - 25} y={height - 8} fill="#64748B" fontSize="10">
          {data[data.length - 1].time}s
        </text>
      </svg>
    </div>
  );
}

// 4. Symmetry Comparative Chart
function SymmetryComparisonChart({ data }) {
  if (!data || data.length === 0) return <div style={styles.noData}>No symmetry metrics available.</div>;

  return (
    <div style={styles.symmetryList}>
      {data.map((item, idx) => (
        <div key={idx} style={styles.symItem}>
          <div style={styles.symHeader}>
            <span style={styles.symMetricName}>{item.metric}</span>
            <div style={styles.symValues}>
              <span style={{ color: '#38BDF8' }}>L: {item.left} {item.unit}</span>
              <span style={{ color: '#64748B' }}>vs</span>
              <span style={{ color: '#FB923C' }}>R: {item.right} {item.unit}</span>
            </div>
            <span style={{
              ...styles.symBadge,
              backgroundColor: item.symmetry >= 88 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: item.symmetry >= 88 ? '#34D399' : '#FBBF24',
              borderColor: item.symmetry >= 88 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
            }}>
              {item.symmetry}% Symmetry
            </span>
          </div>

          <div style={styles.symBarTrack}>
            <div
              style={{
                ...styles.symBarFill,
                width: `${Math.min(100, item.symmetry)}%`,
                backgroundColor: item.symmetry >= 88 ? '#10B981' : '#F59E0B'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px'
  },
  tabBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #1E293B',
    paddingBottom: '12px',
    overflowX: 'auto'
  },
  tabGroup: {
    display: 'flex',
    gap: '8px'
  },
  tab: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    border: '1px solid #334155',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tabActive: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: '1px solid #3B82F6',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px'
  },
  chartCard: {
    backgroundColor: '#111827',
    border: '1px solid #1F2937',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  chartTitle: {
    margin: 0,
    fontSize: '0.92rem',
    fontWeight: '700',
    color: '#F8FAFC'
  },
  chartDesc: {
    margin: '2px 0 0 0',
    fontSize: '0.74rem',
    color: '#94A3B8'
  },
  legend: {
    display: 'flex',
    gap: '6px'
  },
  legendBadge: {
    fontSize: '0.68rem',
    fontWeight: '600',
    border: '1px solid',
    borderRadius: '4px',
    padding: '2px 6px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)'
  },
  svgContainer: {
    width: '100%',
    overflowX: 'auto'
  },
  svg: {
    width: '100%',
    height: 'auto',
    display: 'block'
  },
  noData: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '0.82rem'
  },
  symmetryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '6px'
  },
  symItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  symHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem'
  },
  symMetricName: {
    fontWeight: '600',
    color: '#F1F5F9',
    width: '130px'
  },
  symValues: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.78rem',
    fontFamily: 'monospace'
  },
  symBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid'
  },
  symBarTrack: {
    height: '6px',
    backgroundColor: '#1E293B',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  symBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease'
  }
};
