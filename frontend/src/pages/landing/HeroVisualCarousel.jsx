import React from 'react';
import './HeroVisualCarousel.css';

// Clean chart data — 9 evenly spaced points
const DEFAULT_CHART_POINTS = [
  { day: '1 Aug',  value: 72 },
  { day: '',       value: 84 },
  { day: '04 Aug', value: 88 },
  { day: '',       value: 83 },
  { day: '07 Aug', value: 91 },
  { day: '',       value: 86 },
  { day: '10 Aug', value: 88 },
  { day: '',       value: 87 },
  { day: '13 Aug', value: 90 },
];

export const HeroVisualCarousel = ({
  isDarkMode = false,
  currentTime = new Date(),
  stats = [],
  chartPeriod = 'Daily',
  setChartPeriod = () => {},
  currentChartData = [],
  setShowSearchModal = () => {},
  setShowConfigModal = () => {},
  formatTime = (d) => d?.toLocaleTimeString?.() || '',
  formatDate = (d) => {
    if (!d) return '';
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString?.('en-US', opts) || '';
  },
  onNavigate = () => {}
}) => {
  const displayStats = stats && stats.length === 4 ? stats : [
    { label: 'Total Employees', value: '0', change: '+0%', trend: 'up' },
    { label: 'Present Today',   value: '0', change: '+0%', trend: 'up' },
    { label: 'Late Arrival',    value: '0', change: '-0%', trend: 'down' },
    { label: 'Absent Today',    value: '0', change: '-0%', trend: 'down' }
  ];

  const chartPoints = currentChartData && currentChartData.length > 0
    ? currentChartData
    : DEFAULT_CHART_POINTS;

  // SVG math
  const W = 560, H = 140;
  const PAD_X = 8, PAD_Y = 12;
  const minVal = Math.min(...chartPoints.map(p => p.value)) - 8;
  const maxVal = Math.max(...chartPoints.map(p => p.value)) + 6;
  const toX = (i) => PAD_X + (i / (chartPoints.length - 1)) * (W - PAD_X * 2);
  const toY = (v) => H - PAD_Y - ((v - minVal) / (maxVal - minVal)) * (H - PAD_Y * 2);

  const lineD = chartPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${toX(chartPoints.length - 1).toFixed(1)},${H} L ${PAD_X},${H} Z`;

  // Peak at index 4 (07 Aug, value 91)
  const hlIdx = 4;
  const hlX = toX(hlIdx);
  const hlY = toY(chartPoints[hlIdx].value);

  // "98% Accuracy" near last point
  const lastIdx = chartPoints.length - 1;
  const lastX = toX(lastIdx);
  const lastY = toY(chartPoints[lastIdx].value);

  const xLabels = chartPoints.filter(p => p.day);

  return (
    <div className={`ams-carousel-wrapper ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="ams-glow-aura" />

      <div className="ams-visual-container dashboard-showcase-card">
        <div className="dashboard-card-inner">

          {/* ── Header ── */}
          <div className="db-header">
            <div className="db-title">
              <span className="db-icon">📊</span>
              <span>Dashboard</span>
              <span className="db-badge">LIVE</span>
            </div>
            <button className="db-search" onClick={() => setShowSearchModal(true)} type="button">
              🔍 Quick Search...
            </button>
          </div>

          {/* ── Breadcrumb ── */}
          <div className="db-breadcrumb">
            <span className="bc-link" onClick={() => onNavigate('/login')}>Dashboard</span>
            <span className="separator">›</span>
            <span className="bc-active" onClick={() => setShowConfigModal(true)}>Attendance Insights</span>
          </div>

          {/* ── Time / Date / Productivity ── */}
          <div className="time-row">
            {/* Clock */}
            <div className="clock-box">
              <span className="clock-sun">☀️</span>
              <div>
                <div className="clock-time">{formatTime(currentTime)}</div>
                <div className="clock-label">REALTIME INSIGHT</div>
              </div>
            </div>

            {/* Date + Config */}
            <div className="date-box">
              <div className="date-info-group">
                <span className="date-today-label">Today:</span>
                <span className="date-value">{formatDate(currentTime)}</span>
              </div>
              <button className="config-pill-btn" onClick={() => setShowConfigModal(true)} type="button">
                Advanced Configuration
              </button>
            </div>

            {/* Productivity KPI */}
            <div className="kpi-badge">
              <span className="kpi-arrow">↑</span>
              <span>+24% Productivity</span>
            </div>
          </div>

          {/* ── 4 Stat Cards in 2 × 2 grid ── */}
          <div className="stats-grid-2x2">
            {displayStats.map((stat, i) => {
              const cls = ['stat-purple', 'stat-blue', 'stat-green', 'stat-yellow'];
              const icons = ['', '', '', ''];
              return (
                <div className={`stat-card-v2 ${cls[i]}`} key={i}
                  onClick={() => onNavigate('/login')} style={{ cursor: 'pointer' }}>
                  <div className="scv2-top">
                    <span className="scv2-icon">{icons[i]}</span>
                    <span className="scv2-value">{stat.value}</span>
                  </div>
                  <div className="scv2-label">{stat.label}</div>
                  <div className={`scv2-change ${stat.trend}`}>
                    {stat.trend === 'up' ? '↑' : '↓'} {stat.change} vs yesterday
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Attendance Chart ── */}
          <div className="chart-card">
            <div className="chart-hdr">
              <span className="chart-hdr-title">Attendance Comparison Chart</span>
              <div className="chart-period-tabs">
                {['Daily', 'Weekly', 'Monthly'].map(p => (
                  <button key={p}
                    className={`period-tab ${chartPeriod === p ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setChartPeriod(p); }}
                    type="button">{p}</button>
                ))}
              </div>
            </div>

            <div className="chart-wrap">
              <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dbAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.42" />
                    <stop offset="90%"  stopColor="#6366f1" stopOpacity="0.04" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0,1,2,3].map(i => {
                  const y = PAD_Y + (i / 3) * (H - PAD_Y * 2);
                  return <line key={i} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
                    stroke="rgba(100,116,139,0.18)" strokeWidth="1" strokeDasharray="6,4"/>;
                })}

                {/* Area */}
                <path d={areaD} fill="url(#dbAreaGrad)" />
                {/* Line */}
                <path d={lineD} fill="none" stroke="#6366f1" strokeWidth="2.6"
                  strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots */}
                {chartPoints.map((p, i) => {
                  const isHL = i === hlIdx;
                  return <circle key={i}
                    cx={toX(i)} cy={toY(p.value)}
                    r={isHL ? 5 : 2.8}
                    fill={isHL ? '#60a5fa' : '#6366f1'}
                    stroke={isHL ? '#fff' : 'none'}
                    strokeWidth={isHL ? 2 : 0} />;
                })}

                {/* 91% tooltip */}
                <g>
                  <rect x={hlX - 20} y={hlY - 28} width="40" height="19" rx="6" fill="#4f46e5"/>
                  <text x={hlX} y={hlY - 15} textAnchor="middle" fill="white" fontSize="10.5" fontWeight="bold">91%</text>
                  <polygon points={`${hlX},${hlY - 9} ${hlX-4},${hlY-13} ${hlX+4},${hlY-13}`} fill="#4f46e5"/>
                </g>

                {/* 98% Accuracy label */}
                <g>
                  <rect x={lastX - 52} y={lastY + 8} width="96" height="21" rx="7" fill="#4f46e5"/>
                  <text x={lastX - 4} y={lastY + 22} textAnchor="middle" fill="white" fontSize="10.5" fontWeight="bold">98% Accuracy</text>
                </g>
              </svg>

              {/* X-axis */}
              <div className="chart-x-axis">
                {xLabels.map((p, i) => (
                  <span key={i}>{p.day}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HeroVisualCarousel;
