import { useState, useRef, useEffect } from 'react';
import { authAPI } from '../services/api';
import './OTPLogin.css';

const OTPLogin = ({ onBack, onLoginSuccess }) => {
  const [step, setStep] = useState('input'); // 'input' or 'verify'
  const [contactType, setContactType] = useState('email'); // 'email' or 'mobile'
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme === 'dark';
  });
  
  const otpRefs = useRef([]);

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

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (step === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const contact = contactType === 'email' ? email : mobile;
      
      if (!contact) {
        setError(`Please enter your ${contactType}`);
        setLoading(false);
        return;
      }

      const response = await authAPI.sendOTP(
        contactType === 'email' ? email : null,
        contactType === 'mobile' ? mobile : null
      );

      if (response.success) {
        setMessage(`OTP sent to your ${contactType}`);
        setStep('verify');
        setTimer(60);
        setCanResend(false);
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const otpString = otp.join('');
      
      if (otpString.length !== 6) {
        setError('Please enter complete 6-digit OTP');
        setLoading(false);
        return;
      }

      const response = await authAPI.verifyOTP(
        otpString,
        contactType === 'email' ? email : null,
        contactType === 'mobile' ? mobile : null
      );

      if (response.success) {
        // Store token and user data
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        // legacy cleanup
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Call onLoginSuccess if provided
        if (onLoginSuccess) {
          onLoginSuccess(response.user, response.token);
        } else {
          // Redirect based on role using hash routing
          if (response.user.role === 'admin') {
            window.location.hash = '/admin';
          } else {
            window.location.hash = '/';
          }
        }
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err.message || 'Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.resendOTP(
        contactType === 'email' ? email : null,
        contactType === 'mobile' ? mobile : null
      );

      if (response.success) {
        setMessage('OTP resent successfully');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.message || 'Error resending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  return (
    <div className={`otp-login-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Navigation */}
      <nav className="otp-login-nav">
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

      <div className="otp-login-container">
        <div className="otp-login-card">
          <div className="otp-login-header">
            {onBack && (
              <button className="back-btn" onClick={onBack}>← Back</button>
            )}
            <h1>Welcome Back</h1>
            <p>Login with OTP for secure access</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          {step === 'input' ? (
            <form onSubmit={handleSendOTP} className="otp-input-form">
              <div className="contact-type-toggle">
                <button
                  type="button"
                  className={contactType === 'email' ? 'active' : ''}
                  onClick={() => setContactType('email')}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={contactType === 'mobile' ? 'active' : ''}
                  onClick={() => setContactType('mobile')}
                >
                  Mobile
                </button>
              </div>

              <div className="form-group">
                <label>
                  {contactType === 'email' ? 'Email Address' : 'Mobile Number'}
                </label>
                {contactType === 'email' ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                ) : (
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter your mobile number"
                    required
                  />
                )}
              </div>

              <button 
                type="submit" 
                className="btn-send-otp"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>

              <div className="login-options">
                <a href="/login">Login with password instead</a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="otp-verify-form">
              <div className="otp-sent-info">
                <p>OTP sent to {contactType === 'email' ? email : mobile}</p>
                <button 
                  type="button" 
                  className="btn-change"
                  onClick={() => setStep('input')}
                >
                  Change
                </button>
              </div>

              <div className="form-group">
                <label>Enter 6-digit OTP</label>
                <div className="otp-inputs" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => otpRefs.current[index] = el}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="otp-digit"
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-verify-otp"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="resend-section">
                {canResend ? (
                  <button 
                    type="button" 
                    className="btn-resend"
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                ) : (
                  <p className="timer-text">
                    Resend OTP in {timer}s
                  </p>
                )}
              </div>
            </form>
          )}

          <div className="otp-login-footer">
            <p>Don't have an account? <a href="/signup">Sign up</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPLogin;
