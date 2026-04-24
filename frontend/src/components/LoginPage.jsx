import React, { useState, useEffect } from 'react';

import { authAPI } from '../services/api';

import OTPLogin from './OTPLogin';

import './LoginPage.css';



const LoginPage = ({ onSignupClick, onLoginSuccess, skipWelcome = false }) => {
  const [currentView, setCurrentView] = useState(skipWelcome ? 'login-form' : 'welcome'); // 'welcome', 'login-form', 'otp-login'

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



    // Listen for storage changes (when landing page updates theme)

    window.addEventListener('storage', handleStorageChange);

    

    // Also check periodically in case same window

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
    if (currentView === 'login-form' || currentView === 'otp-login') {
      setCurrentView('welcome');
      setFormData({ email: '', password: '' });
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



  // Welcome View - First Page

  if (currentView === 'welcome') {

    return (

      <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>

        <div className="login-card welcome-card">

          {/* Logo and Brand */}

          <div className="brand-header">

            <div className="brand-logo">

              <span className="logo-icon">📋</span>

            </div>

            <h1 className="brand-name">AttendancePro</h1>

            <p className="brand-tagline">Smart Attendance Management System</p>

          </div>

          

          <div className="welcome-buttons">

            <button 

              className="welcome-button login"

              onClick={handleLoginClick}

            >

              <span className="welcome-icon"></span>

              <span className="welcome-text">Login</span>

            </button>

            

            <button 

              className="welcome-button signup"

              onClick={(e) => { e.preventDefault(); onSignupClick(); }}

            >

              <span className="welcome-icon"></span>

              <span className="welcome-text">Sign Up</span>

            </button>

          </div>

          

          <p className="welcome-footer">Secure • Fast • Reliable</p>

        </div>

      </div>

    );
  }



  // OTP Login View

  if (currentView === 'otp-login') {

    return (

      <OTPLogin 

        onBack={handleBack}

        onLoginSuccess={onLoginSuccess}

      />

    );

  }



  // Login Form View

  return (

    <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>

      <div className="login-card">

        {/* Brand Header */}

        <div className="brand-header-compact">

          <span className="brand-logo-icon">📋</span>

          <span className="brand-name-text">AttendancePro</span>

        </div>

        

        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Sign in to your account</p>

        

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

            className={`login-button ${loading ? 'loading' : ''}`} 

            disabled={loading}

          >

            {loading ? '⏳ Logging in...' : 'Login'}

          </button>

          

          {loading && (

            <div className="loading-info" style={{marginTop: '12px', fontSize: '13px', color: '#6b7280', textAlign: 'center'}}>

              <p>⚡ First login may take 30-40 seconds</p>

              <p>Server is waking up from sleep...</p>

            </div>

          )}

        </form>

        {/* Alternative Login Options */}
        <div className="alternative-login">
          <div className="divider">or</div>
          <button 
            className="otp-login-btn"
            onClick={handleOTPLoginClick}
          >
            <span>📱</span> Login with OTP
          </button>
        </div>

        {error && (

          <div className="error-message">

            {error}

            {error.includes('Server is taking too long') && (

              <button 

                onClick={handleSubmit} 

                className="retry-button"

                style={{marginTop: '10px', padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}

              >

                🔄 Retry Now

              </button>

            )}

          </div>

        )}

        {success && <div className="success-message">{success}</div>}

        

        <button className="back-button back-button-bottom" onClick={handleBack}>

          ← Back

        </button>

      </div>

    </div>

  );

};



export default LoginPage;

