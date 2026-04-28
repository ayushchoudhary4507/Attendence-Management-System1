import React from 'react';
import { Icon } from '../../common/Icon';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'employees', label: 'Employees', icon: 'employees' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'projects', label: 'Projects', icon: 'projects' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const EmployeeSidebar = ({ collapsed, activeTab, onNavigate }) => (
  <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-header">
      <div className="logo">
        <div className="logo-icon">📋</div>
        {!collapsed && <span className="logo-text">AttendancePro</span>}
      </div>
    </div>
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(item => (
        <a key={item.id} href="#" className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}>
          <Icon name={item.icon} />
          {!collapsed && <span>{item.label}</span>}
        </a>
      ))}
    </nav>
    <div className="sidebar-footer">
      <button className="support-btn"><Icon name="help" size={18} />{!collapsed && <span>Raise Support Ticket</span>}</button>
    </div>
  </aside>
);

export default EmployeeSidebar;
