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
      {/* Navigation */}
      <nav className="signup-nav">
        <div className="nav-logo">
          <div className="logo-icon">📋</div>
          <span>AttendancePro</span>
        </div>
        <div className="nav-links">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <div className="signup-container">
        <div className="signup-card">
          <h2 className="signup-title">Create Account</h2>
          <p className="signup-subtitle">Sign up with your Gmail account</p>
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Enter your Gmail address"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number (optional)"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                maxLength="10"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
          {error && <div className="error-message">{error}</div>}
          <p className="login-link">
            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>Login</a>
          </p>
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
