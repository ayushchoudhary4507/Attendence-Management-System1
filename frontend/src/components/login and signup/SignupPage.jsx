  import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import './SignupPage.css';

const SignupPage = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme === 'dark';
  });

  useEffect(() => {
    // Apply theme on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    if (newDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
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

    try {
      const response = await authAPI.signup(formData.name, formData.email, formData.password, formData.phone);
      console.log('Signup successful:', response.user);
      
      // Show success modal instead of auto-login
      setShowSuccessModal(true);
    } catch (error) {
      setError(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onLoginClick(); // Redirect to login page
  };

  return (
    <div className={`signup-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Ambient background glows */}
      <div className="signup-bg-ambient" aria-hidden="true">
        <div className="bg-blob blob-purple" />
        <div className="bg-blob blob-blue" />
        <div className="bg-grid-overlay" />
      </div>

      <div className="signup-layout-wrapper">
        {/* Left Side Feature Showcase Panel */}
        <div className="signup-showcase-panel">
          <div className="showcase-brand">
            <div className="showcase-logo-icon">📋</div>
            <span className="showcase-brand-name">AttendancePro</span>
          </div>

          <div className="showcase-hero">
            <h1 className="showcase-title">
              Your Attendance Management <br />
              <span className="showcase-highlight-text">account awaits.</span>
            </h1>
            <p className="showcase-subtitle">
              Create your account to start tracking smart employee attendance, automated biometric sync, and instant team payroll analytics.
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

        {/* Right Side: Signup Card */}
        <div className="signup-card-section">
          <div className="signup-card">
            <h2 className="signup-title">Create Account</h2>
            <p className="signup-subtitle">Sign up with your details to get started</p>
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">Full Name</label>
                <input
                  type="text"
                  id="signup-name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email Address</label>
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-phone">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="signup-phone"
                  name="phone"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  maxLength="10"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? '⏳ Creating Account...' : 'Sign Up for Free'}
              </button>
            </form>
            {error && <div className="error-message">{error}</div>}
            <p className="login-link">
              Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>Login</a>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="signup-success-modal-overlay">
          <div className="signup-success-modal">
            <div className="success-icon">✅</div>
            <h3>Signup Completed!</h3>
            <p>Your account has been created successfully.</p>
            <p className="login-hint">Please login to continue.</p>
            <button 
              className="go-to-login-btn"
              onClick={handleSuccessModalClose}
            >
              Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupPage;
