import React, { useState, useEffect } from 'react';
import './Settings.css';
import { settingsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { theme, setTheme: setGlobalTheme } = useTheme();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: ''
  });

  // Password & Security state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getProfile();
      if (response.success) {
        const data = response.data;
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          role: data.role || ''
        });
        // Only set theme from DB if no theme preference exists in localStorage
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme && data.settings?.appearance?.theme) {
          setGlobalTheme(data.settings.appearance.theme);
        }
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Saving profile...', profile);
      
      // Update profile
      const profileRes = await settingsAPI.updateProfile(profile);
      console.log('Profile update response:', profileRes);
      
      // Update settings with correct structure
      const activeTheme = localStorage.getItem('theme') || theme;
      const settingsData = {
        settings: {
          appearance: { theme: activeTheme }
        }
      };
      
      await settingsAPI.updateSettings(settingsData);
      await settingsAPI.updateAppearance(activeTheme);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Full error object:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', type: '' });

    if (!passwords.currentPassword.trim() || !passwords.newPassword.trim()) {
      setPasswordMsg({ text: 'Please enter your current and new password.', type: 'error' });
      return;
    }

    if (passwords.newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ text: 'New password and confirm password do not match.', type: 'error' });
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await settingsAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });

      if (res.success) {
        setPasswordMsg({ text: '✓ Password updated successfully! Your account is secure.', type: 'success' });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMsg({ text: res.message || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setPasswordMsg({ text: err.response?.data?.message || err.message || 'Failed to update password', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setGlobalTheme(newTheme);
    
    try {
      await settingsAPI.updateAppearance(newTheme);
    } catch (err) {
      console.error('Error updating theme:', err);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Password & Security', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header-left">
          <h1>Settings</h1>
          <p className="settings-subtitle">Manage your account preferences, password &amp; security, and system appearance</p>
        </div>
        <div className="header-actions">
          {saved && <span className="save-message">✓ Changes saved!</span>}
          {error && <span className="error-message">{error}</span>}
        </div>
      </div>

      {/* Modern Tab Pills Navigation */}
      <div className="settings-tab-pills">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-pill-icon">{tab.icon}</span>
            <span className="tab-pill-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="settings-view">
          <div className="section-header">
            <h2>Profile Information</h2>
            <p className="section-desc">Update your personal information. Changes will be securely saved to MongoDB Atlas.</p>
          </div>
          
          <div className="form-grid-2col">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                placeholder="Enter your department"
              />
            </div>
            <div className="form-group full-width">
              <label>Role</label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="Enter your role"
              />
            </div>
          </div>

          <div className="section-actions">
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes to Atlas'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Password & Security */}
      {activeTab === 'security' && (
        <div className="settings-view">
          <div className="section-header">
            <h2>Password &amp; Security</h2>
            <p className="section-desc">Keep your account safe by updating your password regularly with secure credentials.</p>
          </div>

          {passwordMsg.text && (
            <div className={`security-alert-box ${passwordMsg.type}`}>
              {passwordMsg.text}
            </div>
          )}

          <div className="security-layout-grid">
            <form onSubmit={handlePasswordChange} className="password-change-form">
              <div className="form-group">
                <label>Current Password *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPass.current ? 'text' : 'password'}
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                  >
                    {showPass.current ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPass.new ? 'text' : 'password'}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                  >
                    {showPass.new ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPass.confirm ? 'text' : 'password'}
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                  >
                    {showPass.confirm ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="section-actions" style={{ borderTop: 'none', paddingTop: '10px' }}>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Updating Password...' : '🔐 Update Password'}
                </button>
              </div>
            </form>

            {/* Security Guidelines & Tips Box */}
            <div className="security-tips-card">
              <h3>🛡️ Security Guidelines</h3>
              <ul className="security-tips-list">
                <li>
                  <span className="tip-icon">✓</span>
                  <div>
                    <strong>Minimum 6 Characters</strong>
                    <p>Use at least 6 characters for a strong password.</p>
                  </div>
                </li>
                <li>
                  <span className="tip-icon">✓</span>
                  <div>
                    <strong>Combine Letters &amp; Numbers</strong>
                    <p>Include uppercase, lowercase, numbers &amp; symbols.</p>
                  </div>
                </li>
                <li>
                  <span className="tip-icon">✓</span>
                  <div>
                    <strong>256-Bit Protection</strong>
                    <p>Your password is securely encrypted in MongoDB Atlas.</p>
                  </div>
                </li>
                <li>
                  <span className="tip-icon">✓</span>
                  <div>
                    <strong>Confidential Credentials</strong>
                    <p>Never share your login password with anyone.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Appearance */}
      {activeTab === 'appearance' && (
        <div className="settings-view">
          <div className="section-header">
            <h2>Appearance</h2>
            <p className="section-desc">Choose your preferred theme. Changes apply immediately and save to MongoDB Atlas.</p>
          </div>

          <div className="theme-options">
            <h4>Theme Preference</h4>
            <div className="theme-cards">
              <div 
                className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-preview light"></div>
                <span>Light</span>
              </div>
              <div 
                className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview dark"></div>
                <span>Dark</span>
              </div>
              <div 
                className={`theme-card ${theme === 'auto' ? 'active' : ''}`}
                onClick={() => handleThemeChange('auto')}
              >
                <div className="theme-preview auto"></div>
                <span>Auto</span>
              </div>
            </div>
          </div>

          <div className="current-theme">
            <p>Current theme: <strong>{theme}</strong></p>
          </div>

          <div className="section-actions">
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes to Atlas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

