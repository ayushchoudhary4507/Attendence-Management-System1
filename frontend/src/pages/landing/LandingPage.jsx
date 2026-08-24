import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import HeroVisualCarousel from './HeroVisualCarousel';
import AttendanceProIcon from '../../components/AttendanceProIcon';
import './LandingPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5005';

const BG_CONFIGS = {
  'bg1.jpg': {
    title: 'AI Facial Recognition Attendance Scanner',
    subtitle: 'Lightning-fast contactless identity verification with real-time sync',
    badge: '⚡ AI Face Recognition Scanner'
  },
  'bg2.jpg': {
    title: 'Smart Biometric & NFC Check-In Terminal',
    subtitle: 'Enterprise-grade biometric access point with cloud synchronization',
    badge: '💳 Smart Biometric Card Terminal'
  },
  'bg3.jpg': {
    title: 'Contactless Mobile QR Code Attendance',
    subtitle: 'Dynamic QR geo-fenced check-in for modern workplace teams',
    badge: '📱 Mobile QR Attendance System'
  }
};

const imageModules = import.meta.glob('/public/images/**/*.{jpg,jpeg,png,webp,avif}', { eager: true, as: 'url' });
const BG_IMAGES = Object.keys(imageModules).map(path => {
  const fileName = path.split('/').pop();
  const config = BG_CONFIGS[fileName] || {
    title: 'Advanced Attendance System',
    subtitle: 'Efficiently manage your workforce with our smart platform',
    badge: '✨ Next-Gen Workspace'
  };
  return {
    url: path.replace(/^\/public/, ''),
    title: config.title,
    subtitle: config.subtitle,
    badge: config.badge
  };
});

if (BG_IMAGES.length === 0) {
  BG_IMAGES.push({ url: '', title: 'Welcome', subtitle: 'Attendance System', badge: '👋 Welcome' });
}

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
  const [showBannerControls, setShowBannerControls] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Background Image Rotation every 3 seconds
  useEffect(() => {
    const imageTimer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % Math.max(1, BG_IMAGES.length));
    }, 3000);
    return () => clearInterval(imageTimer);
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

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Subtle Ambient Background Layer */}
      <div className="landing-page-bg-ambient" aria-hidden="true">
        <div className="bg-blob blob-purple" />
        <div className="bg-blob blob-blue" />
        <div className="bg-blob blob-cyan" />
        <div className="bg-grid-overlay" />
        <div className="bg-particles-container">
          <span className="floating-dot d1" />
          <span className="floating-dot d2" />
          <span className="floating-dot d3" />
          <span className="floating-dot d4" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <AttendanceProIcon size={38} />
          <span className="logo-text">Attendance<span className="brand-gradient">Pro</span></span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#demo-carousel">Live Preview</a>
          <button className="theme-toggle" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <path d="M12 7a5 5 0 0 1 0 10v-10z" fill="currentColor"></path>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
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
        <div className="hero-container">
          {/* Top Dedicated Attendance Photo Slider Banner */}
          <div className="hero-top-photo-banner">
            <div className="banner-slider-track">
              {BG_IMAGES.map((bg, idx) => (
                <div
                  key={bg.url}
                  className={`banner-slide ${currentImageIndex === idx ? 'active' : ''}`}
                  style={{ backgroundImage: `url("${bg.url}")` }}
                >
                  <div className="banner-slide-overlay">
                    <div className="banner-slide-content">
                      <h3 className="banner-slide-title">{bg.title}</h3>
                      <p className="banner-slide-desc">{bg.subtitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Left & Right floating arrows (hidden by default, appear on hover/click) */}
            <button
              className="hero-banner-arrow hero-banner-arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) => (prev - 1 + BG_IMAGES.length) % BG_IMAGES.length);
              }}
              aria-label="Previous Slide"
              type="button"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              className="hero-banner-arrow hero-banner-arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) => (prev + 1) % BG_IMAGES.length);
              }}
              aria-label="Next Slide"
              type="button"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Main Hero Content (Left Text + Right Dashboard Preview) */}
          <div className="hero-content">
            {/* Left Hero Content */}
            <div className="hero-text">
              <h1 className="hero-title">
                <span className="gradient-text">ATTENDANCE WEB SYSTEM</span>
              </h1>

              <p className="hero-subtitle">
                Modern dashboard UI with Light & Dark Mode
              </p>

              <p className="hero-description">
                Streamline your workforce management with our intelligent attendance tracking system.
                Real-time insights, automated reporting, and seamless integration.
              </p>

              {/* Feature Stat Cards (Smart / Real-time / Secure) */}
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

            {/* Right Dynamic Visual Area */}
            <div id="demo-carousel" className="hero-dynamic-visual-area">
              <HeroVisualCarousel 
                isDarkMode={isDarkMode} 
                currentTime={currentTime}
                stats={stats}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                currentChartData={currentChartData}
                setShowSearchModal={setShowSearchModal}
                setShowConfigModal={setShowConfigModal}
                formatTime={formatTime}
                formatDate={formatDate}
                onNavigate={navigate}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-header-card">
          <div className="features-badge">
            <span className="badge-sparkle">✦</span>
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="section-title">
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to manage your workforce efficiently
          </p>
        </div>
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

      {/* Premium Modern Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-top-grid">
            {/* Column 1: Brand & Info */}
            <div className="footer-brand-col">
              <div className="footer-brand-header">
                <AttendanceProIcon size={34} />
                <span className="footer-brand-name">AttendancePro</span>
              </div>
              <p className="footer-brand-desc">
                Next-generation smart attendance and workforce management system. Seamless biometric integration, real-time analytics, and enterprise cloud security.
              </p>
              <div className="footer-social-pills">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="social-pill">
                  <span>𝕏</span>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social-pill">
                  <span>in</span>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="social-pill">
                  <span>⌨</span>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-pill">
                  <span>📷</span>
                </a>
              </div>
            </div>

            {/* Column 2: Product & Features */}
            <div className="footer-nav-col">
              <h4 className="footer-heading">Features</h4>
              <ul className="footer-links">
                <li><a href="#demo-carousel" onClick={(e) => { e.preventDefault(); document.getElementById('demo-carousel')?.scrollIntoView({ behavior: 'smooth' }); }}>AI Face Recognition</a></li>
                <li><a href="#demo-carousel" onClick={(e) => { e.preventDefault(); document.getElementById('demo-carousel')?.scrollIntoView({ behavior: 'smooth' }); }}>Smart Biometrics</a></li>
                <li><a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Live Analytics</a></li>
                <li><a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Leave Management</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Geo-Fenced QR Scanner</a></li>
              </ul>
            </div>

            {/* Column 3: Solutions */}
            <div className="footer-nav-col">
              <h4 className="footer-heading">Solutions</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Enterprise Businesses</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Small & Mid Teams</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Remote Workforce</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Shift Scheduling</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Automated Payroll Sync</a></li>
              </ul>
            </div>

            {/* Column 4: Resources & Support */}
            <div className="footer-nav-col">
              <h4 className="footer-heading">Resources</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Documentation</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>API Reference</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Security & Compliance</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Help Center</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>System Status 🟢</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="footer-bottom-bar">
            <div className="footer-copyright-text">
              © {new Date().getFullYear()} <strong>AttendancePro</strong>. All rights reserved. Empowering modern workplace teams.
            </div>
            <div className="footer-legal-links">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Privacy Policy</a>
              <span className="dot-divider">•</span>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Terms of Service</a>
              <span className="dot-divider">•</span>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Security</a>
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
