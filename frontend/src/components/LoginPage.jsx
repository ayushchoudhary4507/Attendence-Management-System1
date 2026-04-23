import React, { useState, useEffect } from 'react';

import { authAPI } from '../services/api';

import OTPLogin from './OTPLogin';

import './LoginPage.css';



const LoginPage = ({ onSignupClick, onLoginSuccess }) => {

  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'role-select', 'login-form'

  const [selectedRole, setSelectedRole] = useState(null);

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

    setCurrentView('role-select');

  };



  const handleOTPLoginClick = () => {

    setCurrentView('otp-login');

  };



  const handleRoleSelect = (role) => {

    setSelectedRole(role);

    setCurrentView('login-form');

    setError('');

    setSuccess('');

  };



  const handleBack = () => {

    if (currentView === 'login-form' || currentView === 'otp-login') {

      setCurrentView('role-select');

      setFormData({ email: '', password: '' });

    } else if (currentView === 'role-select') {

      setCurrentView('welcome');

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

      console.log('🔐 Login attempt:', formData.email, 'Selected role:', selectedRole);

      const response = await authAPI.login(formData.email, formData.password);

      

      console.log('✅ Login response:', response);

      console.log('👤 User from backend:', response.user);

      console.log('🎭 Role from backend:', response.user?.role);

      

      // Check if user's role matches selected role (case-insensitive)

      const actualRole = (response.user?.role || '').toString().toLowerCase().trim();

      const requestedRole = (selectedRole || '').toString().toLowerCase().trim();

      

      console.log('🔍 Role comparison:', { actualRole, requestedRole });

      

      if (actualRole !== requestedRole) {

        console.log('❌ Role mismatch!');

        setError(`Access denied. Your account role is "${response.user?.role || 'unknown'}" but you selected "${selectedRole}". Please select the correct role.`);

        setLoading(false);

        return;

      }

      

      console.log('✅ Role matched! Login successful');

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



  // Role Selection View - Second Page

  if (currentView === 'role-select') {

    return (

      <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>

        <div className="login-card">

          {/* Brand Header */}

          <div className="brand-header-compact">

            <span className="brand-logo-icon">📋</span>

            <span className="brand-name-text">AttendancePro</span>

          </div>

          

          <h2 className="login-title">Select Role</h2>

          <p className="login-subtitle">Choose your role to continue</p>

          

          <div className="role-selection-box">

            <button 

              className="role-button admin"

              onClick={() => handleRoleSelect('admin')}

            >

              <span className="role-icon"></span>

              <span className="role-text">Admin Login</span>

            </button>

            

            <button 

              className="role-button employee"

              onClick={() => handleRoleSelect('employee')}

            >

              <span className="role-icon"></span>

              <span className="role-text">Employee Login</span>

            </button>



            <div className="divider">or</div>



            <button 

              className="role-button otp"

              onClick={handleOTPLoginClick}

            >

              <span className="role-icon"></span>

              <span className="role-text">Login with OTP</span>

            </button>

          </div>

          

          <button className="back-button back-button-bottom" onClick={handleBack}>

            ← Back

          </button>

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



  // Login Form View - Third Page

  return (

    <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>

      <div className="login-card">

        {/* Brand Header */}

        <div className="brand-header-compact">

          <span className="brand-logo-icon">📋</span>

          <span className="brand-name-text">AttendancePro</span>

        </div>

        

        <h2 className="login-title">

          {selectedRole === 'admin' && 'ADMIN LOGIN'}

          {selectedRole === 'employee' && 'EMPLOYEE LOGIN'}

        </h2>

        

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

