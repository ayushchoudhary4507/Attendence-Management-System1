import React, { useState } from 'react';
import './EmployeeLogin.css';

const EmployeeLogin = ({ onLoginSuccess, onSignupClick }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'employee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      // legacy cleanup
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Call success callback
      onLoginSuccess(data.user, data.token);

      // Redirect based on role
      if (data.user.role === 'admin') {
        window.location.hash = '/admin';
      } else {
        window.location.hash = '/';
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Auto login after signup
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        sessionStorage.setItem('token', loginData.token);
        sessionStorage.setItem('user', JSON.stringify(loginData.user));
        // legacy cleanup
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLoginSuccess(loginData.user, loginData.token);
        window.location.hash = '/';
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-login-container">
      <div className="employee-login-box">
        <div className="employee-header">
          <div className="employee-icon">👤</div>
          <h1>{isSignup ? 'Employee Signup' : 'Employee Login'}</h1>
          <p>{isSignup ? 'Create your employee account' : 'Welcome back, Employee'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="employee-login-form">
          {isSignup && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={isSignup}
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="employee@company.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required={isSignup}
              >
                <option value="">Select Department</option>
                <option value="hr">HR</option>
                <option value="it">IT</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="finance">Finance</option>
                <option value="operations">Operations</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            className="employee-login-btn"
            disabled={loading}
          >
            {loading ? (isSignup ? 'Creating Account...' : 'Logging in...') : (isSignup ? 'Create Account' : 'Login as Employee')}
          </button>
        </form>

        <div className="employee-links">
          <button 
            className="toggle-link"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
          >
            {isSignup ? 'Already have an account? Login' : 'New employee? Sign up'}
          </button>
          
          <div className="divider">or</div>
          
          <a href="/#/login" className="admin-link">
            🔐 Admin Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
