import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme === 'dark';
  });
  const [stats, setStats] = useState([
    { label: 'Total Employees', value: '0', change: '+0%', trend: 'up', icon: '' },
    { label: 'Present Today', value: '0', change: '+0%', trend: 'up', icon: '' },
    { label: 'Late Arrival', value: '0', change: '-0%', trend: 'down', icon: '' },
    { label: 'Absent Today', value: '0', change: '-0%', trend: 'down', icon: '' }
  ]);
  const [chartPoints, setChartPoints] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('Daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch disabled - using static 0 values
  // useEffect(() => {
  //   const fetchLandingStats = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await fetch(`${API_URL}/api/public/landing-stats`);
  //       
  //       if (!response.ok) {
  //         throw new Error('Failed to fetch stats');
  //       }
  //       
  //       const data = await response.json();
  //       
  //       if (data.success) {
  //         // Update stats from real data
  //         const realStats = [
  //           { 
  //             label: 'Total Employees', 
  //             value: String(data.data.stats.totalEmployees.value), 
  //             change: data.data.stats.totalEmployees.change, 
  //             trend: data.data.stats.totalEmployees.trend, 
  //             icon: data.data.stats.totalEmployees.icon 
  //           },
  //           { 
  //             label: 'Present Today', 
  //             value: String(data.data.summary.presentToday), 
  //             change: data.data.stats.onTime.change, 
  //             trend: data.data.stats.onTime.trend, 
  //             icon: '' 
  //           },
  //           { 
  //             label: 'Late Arrival', 
  //             value: String(data.data.stats.lateArrival.value), 
  //             change: data.data.stats.lateArrival.change, 
  //             trend: data.data.stats.lateArrival.trend, 
  //             icon: data.data.stats.lateArrival.icon 
  //           },
  //           { 
  //             label: 'Absent Today', 
  //             value: String(data.data.summary.absentToday), 
  //             change: data.data.stats.earlyDepartures.change, 
  //             trend: data.data.stats.earlyDepartures.trend, 
  //             icon: '📊' 
  //           }
  //         ];
  //         setStats(realStats);
  //         
  //         // Update chart data
  //         if (data.data.chartData && data.data.chartData.length > 0) {
  //           setChartPoints(data.data.chartData);
  //         }
  //       }
  //     } catch (err) {
  //       console.error('Error fetching landing stats:', err);
  //       setError(err.message);
  //       // Keep default stats on error
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //
  //   fetchLandingStats();
  //   // Refresh data every 5 minutes
  //   const interval = setInterval(fetchLandingStats, 5 * 60 * 1000);
  //   return () => clearInterval(interval);
  // }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const features = [
    { icon: '📊', title: 'Live Analytics Dashboard', desc: 'Monitor attendance trends with real-time data visualization and instant insights' },
    { icon: '🔒', title: 'Enterprise Security', desc: 'Role-based access control with encrypted data storage and secure authentication' },
    { icon: '⏱️', title: 'Smart Time Tracking', desc: 'Automated work hour calculations with intelligent late arrival detection' },
    { icon: '📱', title: 'Access Anywhere', desc: 'Responsive design works seamlessly on desktop, tablet, and mobile devices' }
  ];

  // Chart data for different periods
  const chartDataByPeriod = {
    Daily: [
      { day: '01 Aug', value: 85 },
      { day: '02 Aug', value: 78 },
      { day: '03 Aug', value: 82 },
      { day: '04 Aug', value: 91 },
      { day: '05 Aug', value: 88 },
      { day: '06 Aug', value: 76 },
      { day: '07 Aug', value: 89 },
      { day: '08 Aug', value: 92 },
      { day: '09 Aug', value: 87 },
      { day: '10 Aug', value: 84 },
      { day: '11 Aug', value: 90 },
      { day: '12 Aug', value: 86 },
      { day: '13 Aug', value: 88 },
      { day: '14 Aug', value: 91 },
      { day: '15 Aug', value: 89 }
    ],
    Weekly: [
      { day: 'Week 1', value: 82 },
      { day: 'Week 2', value: 88 },
      { day: 'Week 3', value: 85 },
      { day: 'Week 4', value: 91 },
      { day: 'Week 5', value: 87 },
      { day: 'Week 6', value: 89 },
      { day: 'Week 7', value: 93 },
      { day: 'Week 8', value: 86 }
    ],
    Monthly: [
      { day: 'Jan', value: 78 },
      { day: 'Feb', value: 82 },
      { day: 'Mar', value: 85 },
      { day: 'Apr', value: 88 },
      { day: 'May', value: 91 },
      { day: 'Jun', value: 87 },
      { day: 'Jul', value: 89 },
      { day: 'Aug', value: 92 },
      { day: 'Sep', value: 84 },
      { day: 'Oct', value: 86 },
      { day: 'Nov', value: 90 },
      { day: 'Dec', value: 88 }
    ]
  };

  // Get current chart data based on selected period - always use demo data for switching
  const currentChartData = chartDataByPeriod[chartPeriod];

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="logo-icon">📋</div>
          <span>AttendancePro</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#demo">Live Preview</a>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button className="nav-btn primary" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="nav-btn secondary" onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">ATTENDANCE<br />WEB SYSTEM</span>
            </h1>
            <p className="hero-subtitle">
              Modern dashboard UI with Light & Dark Mode
            </p>
            <p className="hero-description">
              Streamline your workforce management with our intelligent attendance tracking system.
              Real-time insights, automated reporting, and seamless integration.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">Smart</span>
                <span className="stat-label">Attendance Tracking</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">Real-time</span>
                <span className="stat-label">Dashboard Analytics</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">Secure</span>
                <span className="stat-label">Cloud Based System</span>
              </div>
            </div> 
          </div>

          {/* Dashboard Preview */}
          <div id="demo" className="dashboard-preview">
            <div className="dashboard-card">
              {/* Dashboard Header */}
              <div className="db-header">
                <div className="db-title">
                  <span className="db-icon">📊</span>
                  <span>Dashboard</span>
                  <span className="db-badge">Live</span>
                </div>
                <div className="db-search" onClick={() => setShowSearchModal(true)} style={{ cursor: 'pointer' }}>
                
                  <span className="search-text">Quick Search...</span>
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="db-breadcrumb">
                <span onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Dashboard</span>
                <span className="separator">›</span>
                <span className="active" onClick={() => setShowConfigModal(true)} style={{ cursor: 'pointer' }}>Attendance Insights</span>
              </div>

              {/* Time Widget */}
              <div className="time-widget">
                <div className="time-display">
                  <span className="time-icon">☀️</span>
                  <span className="time-text">{formatTime(currentTime)}</span>
                  <span className="time-label">Realtime Insight</span>
                </div>
                <div className="date-display">
                  <div className="today-label">Today:</div>
                  <div className="date-text">{formatDate(currentTime)}</div>
                  <button className="config-btn" onClick={() => setShowConfigModal(true)}> Advanced Configuration</button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                {stats.map((stat, index) => (
                  <div 
                    className="stat-card" 
                    key={index}
                    onClick={() => navigate('/login')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="stat-card-header">
                      <span className="stat-card-value">{stat.value}</span>
                    </div>
                    <div className="stat-card-label">{stat.label}</div>
                    <div className={`stat-card-change ${stat.trend}`}>
                      <span className="change-indicator">{stat.trend === 'up' ? '↑' : '↓'}</span>
                      {stat.change} {stat.trend === 'up' ? 'vs yesterday' : 'Less than yesterday'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart Section */}
              <div className="chart-section">
                <div className="chart-header">
                  <span className="chart-title">Attendance Comparison Chart</span>
                  <div className="chart-controls">
                    {['Daily', 'Weekly', 'Monthly'].map((period) => (
                      <button
                        key={period}
                        className={`control ${chartPeriod === period ? 'active' : ''}`}
                        onClick={() => setChartPeriod(period)}
                        type="button"
                      >
                        {period}
                      </button>
                    ))}
                    <span className="chart-icon">📊</span>
                  </div>
                </div>
                <div className="chart-container">
                  <svg viewBox="0 0 600 200" className="attendance-chart">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={180 - (y * 1.6)}
                        x2="600"
                        y2={180 - (y * 1.6)}
                        stroke="rgba(100, 100, 100, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    ))}
                    
                    {/* Area under the curve */}
                    <defs>
                      <linearGradient id={`areaGradient${chartPeriod}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0,180 ${currentChartData.map((p, i) => {
                        const x = (i / (currentChartData.length - 1)) * 580 + 10;
                        const y = 180 - (p.value * 1.6);
                        return `L ${x},${y}`;
                      }).join(' ')} L 590,180 Z`}
                      fill={`url(#areaGradient${chartPeriod})`}
                    />
                    
                    {/* Line */}
                    <path
                      d={`M 0,180 ${currentChartData.map((p, i) => {
                        const x = (i / (currentChartData.length - 1)) * 580 + 10;
                        const y = 180 - (p.value * 1.6);
                        return `L ${x},${y}`;
                      }).join(' ')}`}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    
                    {/* Data points */}
                    {currentChartData.map((p, i) => {
                      const x = (i / (currentChartData.length - 1)) * 580 + 10;
                      const y = 180 - (p.value * 1.6);
                      const isHighlighted = i === Math.floor(currentChartData.length / 2);
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r={isHighlighted ? 6 : 3}
                          fill={isHighlighted ? '#60A5FA' : '#4F46E5'}
                          stroke={isHighlighted ? '#fff' : 'none'}
                          strokeWidth={isHighlighted ? 3 : 0}
                          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        />
                      );
                    })}
                    
                    {/* Highlight tooltip */}
                    <g transform="translate(335, 90)">
                      <rect x="-25" y="-30" width="50" height="24" rx="4" fill="#4F46E5" />
                      <text x="0" y="-14" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">91%</text>
                      <polygon points="0,0 -6,-6 6,-6" fill="#4F46E5" transform="translate(0, -6)" />
                    </g>
                    
                    {/* X-axis labels */}
                    {currentChartData.filter((_, i) => i % Math.ceil(currentChartData.length / 5) === 0).map((p, i) => {
                      const originalIndex = i * Math.ceil(currentChartData.length / 5);
                      const x = (originalIndex / (currentChartData.length - 1)) * 580 + 10;
                      return (
                        <text
                          key={i}
                          x={x}
                          y="195"
                          textAnchor="middle"
                          fill="#888"
                          fontSize="9"
                        >
                          {currentChartData[originalIndex]?.day || p.day}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="floating-card card-1">
              <span className="floating-icon"></span>
              <span className="floating-text">+24% Productivity</span>
            </div>
            {true && <div className="floating-card card-2">
              <span className="floating-icon"></span>
              <span className="floating-text">98% Accuracy</span>
            </div>}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">
          Powerful <span className="gradient-text">Features</span>
        </h2>
        <p className="section-subtitle">
          Everything you need to manage your workforce efficiently
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Transform Your Attendance Management?</h2>
          <p className="cta-desc">
            Join thousands of companies already using AttendancePro to streamline their workforce
          </p>
          <div className="cta-buttons">
            <button className="btn-primary large" onClick={() => navigate('/signup')}>
              Start Free Trial
            </button>
            <button className="btn-secondary large" onClick={() => navigate('/login')}>
              Admin Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-columns">
            <div className="footer-column">
              <h4>Features</h4>
              <ul>
                <li><a href="#" onClick={() => navigate('/login')}>Attendance Tracking</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Leave Management</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Employee Directory</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Reports & Analytics</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Solutions</h4>
              <ul>
                <li><a href="#" onClick={() => navigate('/login')}>Small Business</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Enterprise</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Remote Teams</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Shift Workers</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <ul>
                <li><a href="#" onClick={() => navigate('/login')}>Help Center</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>User Guides</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Contact Us</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>FAQs</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="#" onClick={() => navigate('/login')}>Privacy Policy</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Terms of Service</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>GDPR Compliance</a></li>
                <li><a href="#" onClick={() => navigate('/login')}>Data Security</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-brand">
              <div className="logo-icon">📋</div>
              <span>AttendancePro</span>
            </div>
            <p className="footer-copyright">
              © 2024 AttendancePro. All rights reserved.
            </p>
            <div className="footer-social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">Twitter</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">LinkedIn</a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Search</h3>
              <button className="modal-close" onClick={() => setShowSearchModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="search-input"
                placeholder="Search employees, attendance records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="search-btn" onClick={() => { navigate('/login'); }}>
                Search
              </button>
              <p className="search-hint">Try: Employee name, Department, Date</p>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Advanced Configuration</h3>
              <button className="modal-close" onClick={() => setShowConfigModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="config-section">
                <h4>Attendance Settings</h4>
                <div className="config-item">
                  <label>Work Hours</label>
                  <span>09:00 - 18:00</span>
                </div>
                <div className="config-item">
                  <label>Grace Period</label>
                  <span>15 minutes</span>
                </div>
                <div className="config-item">
                  <label>Notifications</label>
                  <span className="toggle active">ON</span>
                </div>
              </div>
              <div className="config-section">
                <h4>Reports</h4>
                <div className="config-item">
                  <label>Daily Reports</label>
                  <span className="toggle active">Enabled</span>
                </div>
                <div className="config-item">
                  <label>Weekly Summary</label>
                  <span className="toggle">Disabled</span>
                </div>
              </div>
              <button className="config-action-btn" onClick={() => { navigate('/login'); }}>
                Open Full Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
