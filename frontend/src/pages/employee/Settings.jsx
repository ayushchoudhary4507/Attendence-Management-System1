import React, { useState, useEffect } from 'react';
import './Settings.css';
import { settingsAPI } from '../../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: ''
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: true,
    employeeUpdates: false,
    systemAlerts: true
  });

  const [theme, setTheme] = useState('light');

  const [security, setSecurity] = useState({
    twoFactor: false,
    lastLogin: 'Mar 10, 2026 at 9:30 AM',
    passwordLastChanged: 'Feb 15, 2026'
  });

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
    loadTheme();
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
        if (data.settings?.notifications) {
          setNotifications(data.settings.notifications);
        }
        if (data.settings?.appearance?.theme) {
          setTheme(data.settings.appearance.theme);
        }
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  };

  const applyTheme = (newTheme) => {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    
    if (newTheme === 'dark') {
      body.classList.add('dark-theme');
    } else if (newTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        body.classList.add('dark-theme');
      } else {
        body.classList.add('light-theme');
      }
    } else {
      body.classList.add('light-theme');
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
      const settingsData = {
        settings: {
          appearance: { theme },
          notifications
        }
      };
      console.log('Saving settings...', settingsData);
      
      const settingsRes = await settingsAPI.updateSettings(settingsData);
      console.log('Settings update response:', settingsRes);
      
      // Update appearance separately
      const themeRes = await settingsAPI.updateAppearance(theme);
      console.log('Theme update response:', themeRes);
      
      // Save theme to localStorage
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Full error object:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    try {
      await settingsAPI.updateAppearance(newTheme);
    } catch (err) {
      console.error('Error updating theme:', err);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <div className="header-actions">
          {saved && <span className="save-message">✓ Changes saved!</span>}
          {error && <span className="error-message">{error}</span>}
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Information</h2>
              <p className="section-desc">Update your personal information. This will be saved to MongoDB Atlas.</p>
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
              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  placeholder="Enter your role"
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="section-desc">Control which notifications you receive. Settings saved to MongoDB Atlas.</p>
              <div className="toggle-list">
                <div className="toggle-item">
                  <div>
                    <h4>Email Alerts</h4>
                    <p>Receive important updates via email</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notifications.emailAlerts}
                      onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div>
                    <h4>Push Notifications</h4>
                    <p>Get real-time notifications in browser</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notifications.pushNotifications}
                      onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div>
                    <h4>Weekly Reports</h4>
                    <p>Receive weekly summary reports</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyReports}
                      onChange={(e) => setNotifications({ ...notifications, weeklyReports: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div>
                    <h4>Employee Updates</h4>
                    <p>Notifications about employee changes</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notifications.employeeUpdates}
                      onChange={(e) => setNotifications({ ...notifications, employeeUpdates: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <div className="security-info">
                <div className="info-item">
                  <span className="label">Last Login:</span>
                  <span>{security.lastLogin}</span>
                </div>
                <div className="info-item">
                  <span className="label">Password Last Changed:</span>
                  <span>{security.passwordLastChanged}</span>
                </div>
              </div>
              <div className="toggle-item">
                <div>
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={security.twoFactor}
                    onChange={(e) => setSecurity({ ...security, twoFactor: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <button className="btn-secondary">Change Password</button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="section-desc">Choose your preferred theme. Changes apply immediately and save to MongoDB Atlas.</p>
              <div className="theme-options">
                <h4>Theme</h4>
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
            </div>
          )}

          <button className="btn-save" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes to Atlas'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
