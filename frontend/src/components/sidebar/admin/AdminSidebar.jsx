import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminSidebar = ({ sidebarCollapsed, mobileSidebarOpen, isMobile, onOverlayClick }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { path: '/employees', label: 'Employees', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { path: '/chat', label: 'Messages', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
    { path: '/analytics', label: 'Analytics', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z' },
    { path: '/workhours', label: 'Work Hours', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
    { path: '/attendance', label: 'Attendance', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z' },
    { path: '/projects', label: 'Projects', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
    { path: '/holidays', label: 'Holidays', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z' },
    { path: '/settings', label: 'Settings', icon: 'M19.14,12.94c0.04,-0.31 0.06,-0.63 0.06,-0.94l0,-0.02c1.06,-0.81 1.87,-1.86 2.33,-3.05l-2.03,-1.58c-0.46,0.74 -1.13,1.33 -1.92,1.7l-0.02,0.01c-0.54,-0.92 -1.28,-1.71 -2.17,-2.3l0.02,-0.02c0.09,-0.84 0.01,-1.7 -0.26,-2.53l-2.39,0.96c0.21,0.76 0.26,1.57 0.13,2.36l-0.01,-0.04c-0.96,-0.18 -1.96,-0.18 -2.92,0l-0.01,-0.04c-0.13,-0.79 -0.08,-1.6 0.13,-2.36l2.39,0.96c0.27,-0.83 0.35,-1.69 0.26,-2.53l-0.02,-0.02c0.89,-0.59 1.63,-1.38 2.17,-2.3l-0.02,-0.01c-0.79,-0.37 1.46,-0.96 1.92,-1.7l2.03,-1.58c-0.46,-1.19 -1.27,-2.24 -2.33,-3.05l0,-0.02zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6s3.6,1.62 3.6,3.6s-1.62,3.6 -3.6,3.6z' },
    { path: '/admin', label: 'Admin Panel', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobile && (
        <div
          className={`mobile-sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
          onClick={onOverlayClick}
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
    </>
  );
};

export default AdminSidebar;
