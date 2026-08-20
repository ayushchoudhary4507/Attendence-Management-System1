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
import NotificationsPage from './pages/Notifications';
import EmployeeWorkHours from './components/employee/EmployeeWorkHours';
import Attendance from './components/employee/Attendance';
import Holidays from './pages/admin/Holidays';
import ShiftManagement from './pages/admin/ShiftManagement';
import AdminSalary from './pages/admin/AdminSalary';
import MonthlyReports from './pages/admin/MonthlyReports';
import AIInsights from './pages/admin/AIInsights';
import AIChat from './pages/admin/AIChat';
import AttendancePredictions from './pages/admin/AttendancePredictions';
import MyShifts from './pages/employee/MyShifts';
import EmployeeSalary from './pages/employee/EmployeeSalary';
import EmployeeReports from './pages/employee/EmployeeReports';
import AdminSidebar from './components/sidebar/admin/AdminSidebar';
import { settingsAPI, API_BASE_URL } from './services/api';
import { NotificationProvider, useNotifications, timeAgo } from './context/NotificationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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
const Layout = ({ children, onLogout, userRole, user, onUserUpdate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  const { notifications, filteredNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, filter, setFilter } = useNotifications();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    profileImage: '',
    removeProfileImage: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const profileModalRef = useRef(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const fileInputRef = useRef(null);

  // Helper: convert relative image path to full URL, or return as-is if already full
  const getImageUrl = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http') || imgPath.startsWith('data:image')) return imgPath;
    const base = API_BASE_URL.replace('/api', '');
    return `${base}${imgPath}`;
  };

  // Fallback avatar URL
  const fallbackAvatar = (name, email) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email || 'User')}&background=4F46E5&color=fff`;

  const searchItems = [
    { label: 'Dashboard', path: '/', icon: '📊', category: 'Page' },
    { label: 'Employees', path: '/employees', icon: '👥', category: 'Page' },
    { label: 'Analytics', path: '/analytics', icon: '📈', category: 'Page' },
    { label: 'Projects', path: '/projects', icon: '📁', category: 'Page' },
    { label: 'Messages', path: '/chat', icon: '💬', category: 'Page' },
    { label: 'Work Hours', path: '/work-hours', icon: '⏰', category: 'Page' },
    { label: 'Attendance', path: '/attendance', icon: '✅', category: 'Page' },
    { label: 'Settings', path: '/settings', icon: '⚙️', category: 'Page' },
    ...(userRole === 'admin' ? [
      { label: 'Shift Management', path: '/shifts', icon: '🗓️', category: 'Page' },
      { label: 'Salary Management', path: '/salary', icon: '💰', category: 'Page' },
      { label: 'Monthly Reports', path: '/reports', icon: '📊', category: 'Page' },
      { label: 'Admin Panel', path: '/admin', icon: '🔐', category: 'Page' },
    ] : [
      { label: 'My Shifts', path: '/my-shifts', icon: '🗓️', category: 'Page' },
      { label: 'My Salary', path: '/my-salary', icon: '💰', category: 'Page' },
    ]),
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

  // Load profile data when modal opens
  const loadProfileData = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      role: user?.role || '',
      profileImage: user?.profileImage || '',
      removeProfileImage: false
    });
    // Handle both relative and full URLs
    setProfileImagePreview(getImageUrl(user?.profileImage) || null);
    setProfileImageFile(null);
  };

  // Handle image file selection with compression
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Compress and resize image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed Base64 string
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          setProfileImageFile(null); // No longer sending File object
          setProfileData((prev) => ({ 
            ...prev, 
            removeProfileImage: false,
            newProfileImageBase64: compressedBase64 // Store the base64 string
          }));
          setProfileImagePreview(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image removal
  const handleImageRemove = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setProfileData({ ...profileData, profileImage: '', removeProfileImage: true });
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

      // Send regular JSON update with the Base64 image
      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        department: profileData.department,
        role: profileData.role,
        profileImage: profileData.removeProfileImage 
          ? null 
          : (profileData.newProfileImageBase64 || user?.profileImage || null),
        removeProfileImage: !!profileData.removeProfileImage
      };

      const response = await fetch(`${API_BASE_URL}/settings/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        const finalProfileImage = profileData.removeProfileImage ? null : (data.data.profileImage || user?.profileImage || null);
        const updatedUser = {
          ...user,
          ...profileData,
          profileImage: finalProfileImage
        };
        
        // Update local state and storage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUserUpdate) onUserUpdate(updatedUser);
        
        setProfileImagePreview(getImageUrl(finalProfileImage) || null);
        setProfileData(prev => ({ ...prev, newProfileImageBase64: null }));
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(data.message || 'Failed to update profile');
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

  return (
    <div className="dashboard-container">
      <AdminSidebar
        sidebarCollapsed={sidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        isMobile={isMobile}
        onOverlayClick={handleOverlayClick}
        user={user}
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
                  <div className={`search-dropdown ${isDarkMode ? 'dark-mode' : ''}`}>
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
                        {['all', 'leave_request', 'user_activity', 'project_update', 'message', 'shift_assigned', 'salary_generated'].map(f => {
                          const filterLabels = {
                            all: 'All',
                            leave_request: '📅 Leave',
                            user_activity: '👤 Activity',
                            project_update: '📊 Project',
                            message: '💬 Message',
                            shift_assigned: '🗓️ Shift',
                            salary_generated: '💰 Salary'
                          };
                          return (
                            <button
                              key={f}
                              className={`filter-btn ${filter === f ? 'active' : ''}`}
                              onClick={() => setFilter(f)}
                            >
                              {filterLabels[f]}
                            </button>
                          );
                        })}
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
                                {notification.type === 'leave_approved' && '✅'}
                                {notification.type === 'leave_rejected' && '❌'}
                                {notification.type === 'late_login' && '⏰'}
                                {notification.type === 'user_activity' && '👤'}
                                {notification.type === 'project_update' && '📊'}
                                {notification.type === 'message' && '💬'}
                                {notification.type === 'leave' && '📅'}
                                {notification.type === 'attendance' && '⏰'}
                                {notification.type === 'checkin' && '✅'}
                                {notification.type === 'checkout' && '🏠'}
                                {notification.type === 'shift_assigned' && '🗓️'}
                                {notification.type === 'salary_generated' && '💰'}
                                {!['leave_request','leave_approved','leave_rejected','late_login','user_activity','project_update','message','leave','attendance','checkin','checkout','shift_assigned','salary_generated'].includes(notification.type) && '🔔'}
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
                <button 
                  className="icon-btn theme-btn" 
                  onClick={toggleTheme}
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" fill="#fbbf24"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#4f46e5"></path>
                    </svg>
                  )}
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
                  src={getImageUrl(user?.profileImage) || fallbackAvatar(user?.name, user?.email)}
                  alt="User"
                  className="user-avatar"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar(user?.name, user?.email); }}
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
                <div className="profile-modal-header-actions">
                  {!isEditing && (
                    <button
                      className="profile-header-btn edit-btn"
                      onClick={() => setIsEditing(true)}
                      title="Edit Profile"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                  )}
                  <button className="close-modal" onClick={() => { setShowProfileModal(false); setIsEditing(false); }}>×</button>
                </div>
              </div>
              <div className="profile-modal-content">
                <div className="profile-avatar-section">
                  <div 
                    className="avatar-wrapper"
                    onClick={() => {
                      const currentSrc = profileImagePreview || getImageUrl(user?.profileImage) || fallbackAvatar(profileData.name, profileData.email);
                      if (currentSrc) {
                        setPreviewModalImage({
                          url: currentSrc,
                          title: profileData.name || user?.name || 'Profile Photo',
                          subtitle: profileData.role || user?.role || 'Employee'
                        });
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full photo"
                  >
                    <img
                      src={profileImagePreview || fallbackAvatar(profileData.name, profileData.email)}
                      alt="Profile"
                      className="profile-modal-avatar"
                      onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar(profileData.name, profileData.email); }}
                    />
                    <div className="avatar-zoom-overlay" title="Click to view photo">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                      </svg>
                    </div>
                    {isEditing && (
                      <div className="avatar-action-buttons" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="avatar-action-btn edit-avatar-btn"
                          onClick={(e) => { e.stopPropagation(); handleImageUploadClick(); }}
                          title="Change profile picture"
                          type="button"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                        </button>
                        {profileImagePreview && (
                          <button
                            className="avatar-action-btn delete-avatar-btn"
                            onClick={(e) => { e.stopPropagation(); handleImageRemove(); }}
                            title="Remove profile picture"
                            type="button"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
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
                  <>
                    <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>Edit Profile</button>
                    <button
                      className="btn-delete-account"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          alert('Account deletion request sent to admin.');
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full Image Preview Modal / Lightbox */}
        {previewModalImage && (
          <div 
            className="image-lightbox-overlay"
            onClick={() => setPreviewModalImage(null)}
          >
            <div 
              className="image-lightbox-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="image-lightbox-header">
                <div className="image-lightbox-info">
                  <h4>{previewModalImage.title}</h4>
                  {previewModalImage.subtitle && <span>{previewModalImage.subtitle}</span>}
                </div>
                <div className="image-lightbox-actions">
                  <a 
                    href={previewModalImage.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    download={`${previewModalImage.title || 'profile'}.jpg`}
                    className="image-lightbox-btn"
                    title="Download / Open Full Photo"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </a>
                  <button 
                    className="image-lightbox-btn close-btn"
                    onClick={() => setPreviewModalImage(null)}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="image-lightbox-body">
                <img 
                  src={previewModalImage.url} 
                  alt={previewModalImage.title || 'Preview'} 
                  className="image-lightbox-img" 
                />
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
  }, []);

  const handleLogin = (userData, token) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    // Notify NotificationContext to initialize socket now that user is logged in
    window.dispatchEvent(new Event('app-login'));
  };

  const handleUserUpdate = (newUserData) => {
    setUser(newUserData);
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
    <ThemeProvider>
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
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Dashboard onLogout={handleLogout} userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/attendance" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/employees" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Employees userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/workhours" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <EmployeeWorkHours />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/projects" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Projects userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/holidays" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Holidays user={user} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Analytics userRole={user?.role} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/ai-insights" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <AIInsights />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/ai-chat" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <AIChat />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/ai-predictions" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <AttendancePredictions />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <Chat user={user} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <NotificationsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Shifts - Role-based: Admin sees management, Employee sees their shifts */}
        <Route path="/shifts" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              {user?.role === 'admin' ? <ShiftManagement user={user} /> : <MyShifts user={user} />}
            </Layout>
          </ProtectedRoute>
        } />

        {/* Salary - Role-based: Admin sees management, Employee sees their salary */}
        <Route path="/salary" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              {user?.role === 'admin' ? <AdminSalary user={user} /> : <EmployeeSalary user={user} />}
            </Layout>
          </ProtectedRoute>
        } />

        {/* Reports - Role-based: Admin sees all, Employee sees their own */}
        <Route path="/reports" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              {user?.role === 'admin' ? <MonthlyReports user={user} /> : <EmployeeReports user={user} />}
            </Layout>
          </ProtectedRoute>
        } />

        {/* My Shifts - Employee (alias) */}
        <Route path="/my-shifts" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user} onUserUpdate={handleUserUpdate}>
              <MyShifts user={user} />
            </Layout>
          </ProtectedRoute>
        } />

        {/* My Salary - Employee (alias) */}
        <Route path="/my-salary" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
            <Layout onLogout={handleLogout} userRole={user?.role} user={user}>
              <EmployeeSalary user={user} />
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
    </ThemeProvider>
  );
}

export default App;
