import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import OTPLogin from './OTPLogin';
import AttendanceProIcon from '../AttendanceProIcon';
import './LoginPage.css';



const LoginPage = ({ onSignupClick, onLoginSuccess, skipWelcome = true }) => {
  const [currentView, setCurrentView] = useState('login-form'); // 'login-form', 'otp-login'

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme === 'dark';
  });

  // Listen for theme changes from landing page
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setIsDarkMode(savedTheme === 'dark');
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLoginClick = () => {
    setCurrentView('login-form');
    setError('');
    setSuccess('');
  };

  const handleOTPLoginClick = () => {
    setCurrentView('otp-login');
  };

  const handleBack = () => {
    if (currentView === 'otp-login') {
      setCurrentView('login-form');
      setError('');
    } else {
      window.location.href = '/';
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 Login attempt:', formData.email);
      const response = await authAPI.login(formData.email, formData.password);
      
      console.log('✅ Login response:', response);
      console.log('👤 User from backend:', response.user);
      console.log('🎭 Role from backend:', response.user?.role);
      
      console.log('✅ Login successful');
      setSuccess(response.message);
      
      if (onLoginSuccess) {
        onLoginSuccess(response.user, response.token);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // OTP Login View
  if (currentView === 'otp-login') {
    return (
      <OTPLogin 
        onBack={handleBack}
        onLoginSuccess={onLoginSuccess}
      />
    );
  }
  return (
    <div className="login-page-container">
      {/* Background Decorative Gradients */}
      <div className="login-bg-decorations">
        <div className="bg-blob blob-purple" />
        <div className="bg-blob blob-blue" />
        <div className="bg-grid-overlay" />
      </div>

      <div className="login-layout-wrapper">
        {/* Left Side Feature Showcase Panel (Matching user screenshot) */}
        <div className="login-showcase-panel">
          <div className="showcase-brand">
            <AttendanceProIcon size={46} />
            <span className="showcase-brand-name">AttendancePro</span>
          </div>

          <div className="showcase-hero">
            <h1 className="showcase-title">
              Your Attendance Management <br />
              <span className="showcase-highlight-text">dashboard awaits.</span>
            </h1>
            <p className="showcase-subtitle">
              Sign in to continue tracking employee clock-ins, monitoring live analytics, and generating automated compliance reports with intelligent insights.
            </p>
          </div>

          <div className="showcase-features">
            <div className="showcase-feature-item">
              <div className="feature-icon-box">
                <span className="f-icon">📷</span>
              </div>
              <div className="feature-text-group">
                <h4 className="feature-item-title">Automated AI Captures</h4>
                <p className="feature-item-desc">High-speed facial & biometric verification on schedule</p>
              </div>
            </div>

            <div className="showcase-feature-item">
              <div className="feature-icon-box">
                <span className="f-icon">🔔</span>
              </div>
              <div className="feature-text-group">
                <h4 className="feature-item-title">Real-Time Attendance Alerts</h4>
                <p className="feature-item-desc">Instant alerts when late arrival or early departure occurs</p>
              </div>
            </div>

            <div className="showcase-feature-item">
              <div className="feature-icon-box">
                <span className="f-icon">📄</span>
              </div>
              <div className="feature-text-group">
                <h4 className="feature-item-title">Audit & Payroll Reports</h4>
                <p className="feature-item-desc">One-click compliance packages and payroll ready export</p>
              </div>
            </div>
          </div>

          <div className="showcase-trust-badge">
            <span className="trust-dot" />
            <span>Trusted by 10,000+ modern workplaces across the globe</span>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="login-card-section">
          <div className="login-card">
            <div className="brand-header-compact">
              <AttendanceProIcon size={36} />
              <span className="brand-name-text">AttendancePro</span>
            </div>

            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Sign in to access your portal</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <button 
                type="submit" 
                className={`login-button ${loading ? 'btn-loading' : ''}`} 
                disabled={loading}
              >
                {loading ? '⏳ Logging in...' : 'Login to Dashboard'}
              </button>
            </form>

            {/* Alternative Login Options */}
            <div className="alternative-login">
              <div className="divider">or</div>
              <button 
                className="otp-login-btn"
                onClick={handleOTPLoginClick}
                type="button"
              >
                <span>📱</span> Login with OTP
              </button>
            </div>

            {onSignupClick && (
              <div className="signup-prompt">
                <span>Don't have an account? </span>
                <button 
                  type="button"
                  onClick={onSignupClick} 
                  className="signup-link-btn"
                >
                  Sign Up
                </button>
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
                {error.includes('Server is taking too long') && (
                  <button 
                    onClick={handleSubmit} 
                    className="retry-button"
                    type="button"
                  >
                    🔄 Retry Now
                  </button>
                )}
              </div>
            )}

            {success && <div className="success-message">{success}</div>}

            <button className="back-button back-button-bottom" onClick={() => window.history.back()} type="button">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

