import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import LoginPage from './components/login and signup/LoginPage';
import SignupPage from './components/login and signup/SignupPage';
import AdminLogin from './pages/admin/AdminLogin';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import LandingPage from './pages/landing/LandingPage';
import Dashboard from './pages/employee/Dashboard';
import Analytics from './pages/admin/Analytics';
import Employees from './pages/admin/Employees';
import Projects from './pages/admin/Projects';
import Settings from './pages/employee/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import Chat from './pages/employee/Chat';
import EmployeeWorkHours from './components/employee/EmployeeWorkHours';
import Attendance from './components/employee/Attendance';
import Holidays from './pages/admin/Holidays';
import AdminSidebar from './components/sidebar/admin/AdminSidebar';
import { settingsAPI } from './services/api';
import { NotificationProvider, useNotifications, timeAgo } from './context/NotificationContext';
import ToastNotification from './components/ToastNotification';
import './App.css';
import './styles/responsive.css';

// Wrapper components for navigation
const LoginPageWrapper = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  return <LoginPage onSignupClick={() => navigate('/signup')} onLoginSuccess={onLoginSuccess} skipWelcome={true} />;
};

const SignupPageWrapper = () => {
  const navigate = useNavigate();
  return <SignupPage onLoginClick={() => navigate('/login')} />;
};

// Layout Component with Sidebar - using React Router
const Layout = ({ children, onLogout, userRole, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  const { notifications, filteredNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, filter, setFilter } = useNotifications();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Handle click outside to close mobile sidebar
  const handleOverlayClick = () => {
    setMobileSidebarOpen(false);
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const notificationBtnRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    profileImage: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const profileModalRef = useRef(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const searchItems = [
    { label: 'Dashboard', path: '/', icon: '📊', category: 'Page' },
    { label: 'Employees', path: '/employees', icon: '👥', category: 'Page' },
    { label: 'Analytics', path: '/analytics', icon: '📈', category: 'Page' },
    { label: 'Projects', path: '/projects', icon: '📁', category: 'Page' },
    { label: 'Messages', path: '/chat', icon: '💬', category: 'Page' },
    { label: 'Work Hours', path: '/work-hours', icon: '⏰', category: 'Page' },
    { label: 'Attendance', path: '/attendance', icon: '✅', category: 'Page' },
    { label: 'Settings', path: '/settings', icon: '⚙️', category: 'Page' },
    ...(userRole === 'admin' ? [{ label: 'Admin Panel', path: '/admin', icon: '🔐', category: 'Page' }] : []),
    { label: 'Add Employee', path: '/employees', action: 'add', icon: '➕', category: 'Action' },
    { label: 'Export Data', path: '/employees', action: 'export', icon: '📥', category: 'Action' },
    { label: 'View All Employees', path: '/employees', icon: '👤', category: 'Action' },
  ];

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    const filtered = searchItems.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSearchClick = (item) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    navigate(item.path);
  };
  
  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedDropdown = notificationRef.current && notificationRef.current.contains(event.target);
      const clickedButton = notificationBtnRef.current && notificationBtnRef.current.contains(event.target);
      if (!clickedDropdown && !clickedButton) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    applyTheme(savedTheme);
  };

  // Load profile data when modal opens
  const loadProfileData = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      role: user?.role || '',
      profileImage: user?.profileImage || ''
    });
    // Handle both relative and full URLs
    const profileImg = user?.profileImage;
    const fullUrl = profileImg && !profileImg.startsWith('http') ? `http://localhost:5005${profileImg}` : profileImg;
    setProfileImagePreview(fullUrl || null);
    setProfileImageFile(null);
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setProfileImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image removal
  const handleImageRemove = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setProfileData({ ...profileData, profileImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input click
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle profile modal open
  const handleProfileClick = () => {
    loadProfileData();
    setShowProfileModal(true);
    setIsEditing(false);
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setSaving(true);

      // If there's an image file, use FormData for multipart upload
      if (profileImageFile) {
        const formData = new FormData();
        formData.append('name', profileData.name);
        formData.append('email', profileData.email);
        formData.append('phone', profileData.phone);
        formData.append('department', profileData.department);
        formData.append('role', profileData.role);
        formData.append('profileImage', profileImageFile);

        const response = await fetch('http://localhost:5005/api/settings/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
          },
          body: formData
        });
        const data = await response.json();
        if (data.success) {
          // Update user object in both localStorage and sessionStorage
          const updatedUser = { 
            ...user, 
            ...profileData, 
            profileImage: data.data.profileImage ? `http://localhost:5005${data.data.profileImage}` : null 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setProfileImageFile(null);
          setProfileImagePreview(updatedUser.profileImage || null);
          setIsEditing(false);
          alert('Profile updated successfully!');
        } else {
          alert('Failed to update profile');
        }
      } else {
        // No image file, regular JSON update
        const response = await fetch('http://localhost:5005/api/settings/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
          },
          body: JSON.stringify(profileData)
        });
        const data = await response.json();
        if (data.success) {
          // Update user object in both localStorage and sessionStorage
          // If user explicitly removed image (profileImage === ''), clear it
          const updatedUser = {
            ...user,
            ...profileData,
            profileImage: profileData.profileImage === '' ? null : (user?.profileImage || null)
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setProfileImagePreview(updatedUser.profileImage);
          setIsEditing(false);
          alert('Profile updated successfully!');
        } else {
          alert('Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  // Close profile modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileModalRef.current && !profileModalRef.current.contains(event.target)) {
        setShowProfileModal(false);
        setIsEditing(false);
      }
    };
    if (showProfileModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileModal]);

  const applyTheme = (theme) => {
    document.body.classList.remove('light-theme', 'dark-theme');
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar
        sidebarCollapsed={sidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        isMobile={isMobile}
        onOverlayClick={handleOverlayClick}
      />

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <button 
                className={`mobile-menu-toggle ${mobileSidebarOpen ? 'active' : ''}`}
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                aria-label="Toggle menu"
              >
                <div className="hamburger-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            )}
            
            {/* Desktop Sidebar Toggle */}
            {!isMobile && (
              <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
              </button>
            )}
            <nav className="breadcrumb">
              <Link to="/" className="breadcrumb-home">Home</Link>
              <span className="separator">›</span>
              <span className="current">{currentPath === '/' ? 'Dashboard' : currentPath.replace('/', '').charAt(0).toUpperCase() + currentPath.slice(2)}</span>
            </nav>
          </div>
          <div className="header-right">
            <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="icon-btn search-btn" onClick={() => setShowSearch(!showSearch)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>

                {/* Search Dropdown */}
                {showSearch && (
                  <div className="search-dropdown">
                    <div className="search-header">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#9CA3AF">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                      </svg>
                      <input 
                        type="text" 
                        placeholder="Search pages, actions..." 
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoFocus
                        className="search-input"
                      />
                      <button className="close-search" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>×</button>
                    </div>
                    <div className="search-results">
                      {searchQuery.trim() === '' ? (
                        <div className="search-suggestions">
                          <p className="search-section-title">Quick Access</p>
                          {searchItems.slice(0, 8).map((item) => (
                            <div key={item.label} className="search-item" onClick={() => handleSearchClick(item)}>
                              <span className="search-item-icon">{item.icon}</span>
                              <span className="search-item-label">{item.label}</span>
                              <span className="search-item-category">{item.category}</span>
                            </div>
                          ))}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="no-search-results">No results found for "{searchQuery}"</div>
                      ) : (
                        searchResults.map((item) => (
                          <div key={item.label} className="search-item" onClick={() => handleSearchClick(item)}>
                            <span className="search-item-icon">{item.icon}</span>
                            <span className="search-item-label">{item.label}</span>
                            <span className="search-item-category">{item.category}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <button ref={notificationBtnRef} className="icon-btn notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h20v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                    </svg>
                    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div ref={notificationRef} className={`notification-dropdown ${isDarkMode ? 'dark-mode' : ''}`}>
                      <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-header-actions">
                          {unreadCount > 0 && (
                            <button className="mark-all-read" onClick={markAllAsRead}>Mark all read</button>
                          )}
                        </div>
                      </div>
                      {/* Filter tabs */}
                      <div className="notification-filters">
                        {['all', 'leave_request', 'user_activity', 'project_update', 'message'].map(f => (
                          <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                          >
                            {f === 'all' ? 'All' : f === 'leave_request' ? '📅 Leave' : f === 'user_activity' ? '👤 Activity' : f === 'project_update' ? '📊 Project' : '💬 Message'}
                          </button>
                        ))}
                      </div>
                      <div className="notification-list">
                        {filteredNotifications.length === 0 ? (
                          <div className="no-notifications">No notifications</div>
                        ) : (
                          filteredNotifications.slice(0, 20).map((notification) => (
                            <div
                              key={notification.id || notification._id}
                              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                              onClick={() => {
                                markAsRead(notification.id || notification._id);
                                if (notification.link) navigate(notification.link);
                              }}
                            >
                              <div className="notification-icon">
                                {notification.type === 'leave_request' && '📅'}
                                {notification.type === 'user_activity' && '👤'}
                                {notification.type === 'project_update' && '📊'}
                                {notification.type === 'message' && '💬'}
                                {notification.type === 'leave' && '📅'}
                                {notification.type === 'attendance' && '⏰'}
                                {notification.type === 'checkin' && '✅'}
                                {notification.type === 'checkout' && '🏠'}
                                {!['leave_request','user_activity','project_update','message','leave','attendance','checkin','checkout'].includes(notification.type) && '🔔'}
                              </div>
                              <div className="notification-content">
                                <p className="notification-title">{notification.title}</p>
                                <p className="notification-message">{notification.message}</p>
                                <span className="notification-time">{timeAgo(notification.createdAt)}</span>
                              </div>
                              <button
                                className="delete-notification"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id || notification._id);
                                }}
                              >×</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button className="icon-btn theme-btn" onClick={() => {
                  const isDark = document.body.classList.contains('dark-theme');
                  const newTheme = isDark ? 'light' : 'dark';
                  setIsDarkMode(!isDark);
                  localStorage.setItem('theme', newTheme);
                  document.body.classList.remove('light-theme', 'dark-theme');
                  document.body.classList.add(newTheme + '-theme');
                }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 9c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/>
                  </svg>
                </button>
              </div>
              <div
                className="user-info"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '15px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }}
                onClick={handleProfileClick}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <img
                  src={user?.profileImage && !user?.profileImage.startsWith('http') ? `http://localhost:5005${user?.profileImage}` : user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=4F46E5&color=fff`}
                  alt="User"
                  className="user-avatar"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div className="user-info-text">
                  <div className="user-name">{user?.name || 'User'}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </div>
              <button className="logout-btn" onClick={onLogout} style={{ 
                padding: '8px 16px', 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}>Logout</button>
            </div>
          </div>
        </header>

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="profile-modal-overlay">
            <div ref={profileModalRef} className={`profile-modal ${isDarkMode ? 'dark-mode' : ''}`}>
              <div className="profile-modal-header">
                <h2>Profile Details</h2>
                <button className="close-modal" onClick={() => { setShowProfileModal(false); setIsEditing(false); }}>×</button>
              </div>
              <div className="profile-modal-content">
                <div className="profile-avatar-section">
                  <div className="avatar-wrapper">
                    <img
                      src={profileImagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || 'User')}&background=4F46E5&color=fff&size=80`}
                      alt="Profile"
                      className="profile-modal-avatar"
                    />
                    {isEditing && (
                      <button className="upload-avatar-btn" onClick={handleImageUploadClick} title="Change profile picture">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                    )}
                    {isEditing && profileImagePreview && (
                      <button className="remove-avatar-btn" onClick={handleImageRemove} title="Remove profile picture">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <h3>{profileData.name || 'User'}</h3>
                  <p className="profile-role">{profileData.role || 'Employee'}</p>
                  {isEditing && !profileImagePreview && (
                    <p className="upload-hint">Click the camera icon to add a profile picture</p>
                  )}
                </div>
                <div className="profile-details">
                  <div className="profile-detail-item">
                    <label>Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="profile-input"
                      />
                    ) : (
                      <span className="profile-value">{profileData.name || 'N/A'}</span>
                    )}
                  </div>
                  <div className="profile-detail-item">
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="profile-input"
                      />
                    ) : (
                      <span className="profile-value">{profileData.email || 'N/A'}</span>
                    )}
                  </div>
                  <div className="profile-detail-item">
                    <label>Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="profile-input"
                      />
                    ) : (
                      <span className="profile-value">{profileData.phone || 'N/A'}</span>
                    )}
                  </div>
                  <div className="profile-detail-item">
                    <label>Department</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                        className="profile-input"
                      />
                    ) : (
                      <span className="profile-value">{profileData.department || 'N/A'}</span>
                    )}
                  </div>
                  <div className="profile-detail-item">
                    <label>Role</label>
                    <span className="profile-value">{profileData.role || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="profile-modal-actions">
                {isEditing ? (
                  <>
                    <button className="btn-cancel" onClick={() => { setIsEditing(false); loadProfileData(); }} disabled={saving}>Cancel</button>
                    <button className="btn-save-profile" onClick={handleProfileUpdate} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>Edit Profile</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ isAuthenticated, user, children }) => {
  console.log('ProtectedRoute check - isAuthenticated:', isAuthenticated, 'user:', user?.role);
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to landing');
    return <Navigate to="/landing" replace />;
  }
  return children;
};

// Admin Route Component  
const AdminRoute = ({ isAuthenticated, user, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('App render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  useEffect(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
    
    // Load theme on app start
    const loadAppTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.body.classList.remove('light-theme', 'dark-theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else if (savedTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    };
    loadAppTheme();
  }, []);

  const handleLogin = (userData, token) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="loading-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <ToastNotification />
      <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" /> : <LoginPageWrapper onLoginSuccess={handleLogin} />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/" /> : <SignupPageWrapper />
        } />
        <Route path="/employee-login" element={
          isAuthenticated ? <Navigate to="/" /> : <EmployeeLogin onLoginSuccess={handleLogin} />
        } />
        <Route path="/admin-login" element={
          isAuthenticated ? <Navigate to="/" /> : <AdminLogin onLoginSuccess={handleLogin} />
        } />

        {/* Protected Routes with Layout */}
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Dashboard onLogout={handleLogout} userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/attendance" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/employees" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Employees userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/workhours" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <EmployeeWorkHours />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/projects" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Projects userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/holidays" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Holidays user={user} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Analytics userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <Chat user={user} />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Admin Only Route */}
        <Route path="/admin" element={
          <AdminRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <AdminDashboard />
            </Layout>
          </AdminRoute>
        } />

        {/* Catch all - redirect to landing or dashboard */}
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/" /> : <Navigate to="/landing" />
        } />
      </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
