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

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: true,
    employeeUpdates: false,
    systemAlerts: true
  });

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
        if (data.settings?.notifications) {
          setNotifications(data.settings.notifications);
        }
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
          appearance: { theme: activeTheme },
          notifications
        }
      };
      console.log('Saving settings...', settingsData);
      
      const settingsRes = await settingsAPI.updateSettings(settingsData);
      console.log('Settings update response:', settingsRes);
      
      // Update appearance separately
      const themeRes = await settingsAPI.updateAppearance(activeTheme);
      console.log('Theme update response:', themeRes);
      
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
    setGlobalTheme(newTheme);
    
    try {
      await settingsAPI.updateAppearance(newTheme);
    } catch (err) {
      console.error('Error updating theme:', err);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header-left">
          <h1>Settings</h1>
          <p className="settings-subtitle">Manage your account preferences, notifications, and system appearance</p>
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

      {/* Direct Full-Width Settings Views */}
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

      {activeTab === 'notifications' && (
        <div className="settings-view">
          <div className="section-header">
            <h2>Notification Preferences</h2>
            <p className="section-desc">Control which alerts and notifications you receive. Preferences saved to MongoDB Atlas.</p>
          </div>

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

          <div className="section-actions">
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes to Atlas'}
            </button>
          </div>
        </div>
      )}

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
