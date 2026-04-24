import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import AdminLogin from './pages/AdminLogin';
import EmployeeLogin from './pages/EmployeeLogin';
import LandingPage from './pages/landing/LandingPage';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import EmployeeWorkHours from './components/EmployeeWorkHours';
import Attendance from './components/Attendance';
import { settingsAPI } from './services/api';
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const searchItems = [
    { label: 'Dashboard', path: '/', icon: '📊', category: 'Page' },
    { label: 'Employees', path: '/employees', icon: '👥', category: 'Page' },
    { label: 'Analytics', path: '/analytics', icon: '📈', category: 'Page' },
    { label: 'Projects', path: '/projects', icon: '📁', category: 'Page' },
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
  
  // Load theme and notifications on mount
  useEffect(() => {
    loadTheme();
    fetchNotifications();
  }, []);

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    applyTheme(savedTheme);
  };

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

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await settingsAPI.getNotifications();
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      // Use default notifications if API fails
      setNotifications([
        { id: 1, title: 'Welcome!', message: 'Your notifications will appear here', time: 'Just now', read: false, type: 'info' }
      ]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await settingsAPI.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Still update UI even if API fails
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    try {
      await settingsAPI.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (id) => {
    try {
      await settingsAPI.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { path: '/employees', label: 'Employees', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { path: '/chat', label: 'Messages', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
    { path: '/analytics', label: 'Analytics', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z' },
    { path: '/workhours', label: 'Work Hours', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
    { path: '/attendance', label: 'Attendance', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z' },
    { path: '/projects', label: 'Projects', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
    { path: '/settings', label: 'Settings', icon: 'M19.14,12.94c0.04,-0.31 0.06,-0.63 0.06,-0.94l0,-0.02c1.06,-0.81 1.87,-1.86 2.33,-3.05l-2.03,-1.58c-0.46,0.74 -1.13,1.33 -1.92,1.7l-0.02,0.01c-0.54,-0.92 -1.28,-1.71 -2.17,-2.3l0.02,-0.02c0.09,-0.84 0.01,-1.7 -0.26,-2.53l-2.39,0.96c0.21,0.76 0.26,1.57 0.13,2.36l-0.01,-0.04c-0.96,-0.18 -1.96,-0.18 -2.92,0l-0.01,-0.04c-0.13,-0.79 -0.08,-1.6 0.13,-2.36l2.39,0.96c0.27,-0.83 0.35,-1.69 0.26,-2.53l-0.02,-0.02c0.89,-0.59 1.63,-1.38 2.17,-2.3l-0.02,-0.01c-0.79,-0.37 1.46,-0.96 1.92,-1.7l2.03,-1.58c-0.46,-1.19 -1.27,-2.24 -2.33,-3.05l0,-0.02zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6s3.6,1.62 3.6,3.6s-1.62,3.6 -3.6,3.6z' },
    ...(userRole === 'admin' ? [{ path: '/admin', label: 'Admin Panel', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' }] : []),
  ];

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Overlay */}
      {isMobile && (
        <div 
          className={`mobile-sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">📋</div>
            {!sidebarCollapsed && <span className="logo-text">AttendancePro</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d={item.icon}/>
              </svg>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="support-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
            {!sidebarCollapsed && <span>Raise Support Ticket</span>}
          </button>
        </div>
      </aside>

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
                          {searchItems.slice(0, 5).map((item) => (
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
                <button className="icon-btn notification-btn" onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h20v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                  </svg>
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
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

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className={`notification-dropdown ${isDarkMode ? 'dark-mode' : ''}`}>
                    <div className="notification-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="mark-all-read" onClick={markAllAsRead}>Mark all as read</button>
                      )}
                    </div>
                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <div className="no-notifications">No notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                            <div className="notification-icon">
                              {notification.type === 'success' && '✅'}
                              {notification.type === 'warning' && '⚠️'}
                              {notification.type === 'info' && 'ℹ️'}
                            </div>
                            <div className="notification-content" onClick={() => markAsRead(notification.id)}>
                              <p className="notification-title">{notification.title}</p>
                              <p className="notification-message">{notification.message}</p>
                              <span className="notification-time">{notification.time}</span>
                            </div>
                            <button className="delete-notification" onClick={() => deleteNotification(notification.id)}>×</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '15px' }}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=4F46E5&color=fff`} 
                  alt="User" 
                  className="user-avatar" 
                  style={{ width: '35px', height: '35px', borderRadius: '50%' }}
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
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
  );
}

export default App;
