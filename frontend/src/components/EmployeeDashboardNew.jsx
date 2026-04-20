import React, { useState, useRef, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { Icon } from './Icon';
import { AddEmployeeModal, InviteModal } from './EmployeeModals';
import './EmployeeDashboard.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'employees', label: 'Employees', icon: 'employees' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'projects', label: 'Projects', icon: 'projects' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const Sidebar = ({ collapsed }) => (
  <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-header">
      <div className="logo">
        <div className="logo-icon"><Icon name="logo" size={24} /></div>
        {!collapsed && <span className="logo-text">TechProject</span>}
      </div>
    </div>
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(item => (
        <a key={item.id} href="#" className={`nav-item ${item.id === 'employees' ? 'active' : ''}`}>
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

const Header = ({ collapsed, setCollapsed, onLogout }) => (
  <header className="top-header">
    <div className="header-left">
      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}><Icon name="menu" /></button>
      <nav className="breadcrumb"><span>Home</span><span className="separator">›</span><span className="current">Employees</span></nav>
    </div>
    <div className="header-right">
      <div className="header-icons">
        <button className="icon-btn"><Icon name="search" /></button>
        <button className="icon-btn"><Icon name="bell" /><span className="badge">76</span></button>
        <button className="icon-btn"><Icon name="help" /></button>
      </div>
      <div className="user-menu">
        <img src="https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff" alt="User" className="user-avatar" />
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  </header>
);

const Filters = ({ searchTerm, setSearchTerm, roleFilter, setRoleFilter, statusFilter, setStatusFilter }) => (
  <div className="filters-bar">
    <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
      {['All', 'Employee', 'Interns', 'Manager'].map(r => <option key={r} value={r}>{r === 'All' ? 'All Employees' : r}</option>)}
    </select>
    <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
      {['All', 'Software Development', 'Intern', 'Manager'].map(d => <option key={d} value={d}>{d === 'All' ? 'All Designations' : d}</option>)}
    </select>
    <div className="search-box">
      <Icon name="search" size={18} className="search-icon" />
      <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
    </div>
    <button className="filter-btn"><Icon name="filter" size={18} />Filters</button>
  </div>
);

const ActionMenu = ({ onDelete }) => {
  const handleClick = () => {
    alert('Button clicked!');
    if (confirm('Delete this employee?')) {
      alert('Confirmed delete!');
      onDelete();
    }
  };

  return (
    <button 
      onClick={handleClick}
      style={{ 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer',
        padding: '8px'
      }}
    >
      <Icon name="more" size={18} />
    </button>
  );
};

const EmployeeRow = ({ emp, selected, onToggle, onDelete }) => (
  <tr>
    <td><input type="checkbox" checked={selected} onChange={onToggle} /></td>
    <td className="employee-id">{emp.id}</td>
    <td>
      <div className="employee-info">
        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=4F46E5&color=fff`} alt={emp.name} className="employee-avatar" />
        <div className="employee-details">
          <span className="employee-name">{emp.name}</span>
          <span className="employee-designation">{emp.designation}</span>
        </div>
      </div>
    </td>
    <td className="email-col">{emp.email}</td>
    <td><span className={`role-badge ${emp.role.toLowerCase()}`}>{emp.role}</span></td>
    <td>{emp.reportingTo}</td>
    <td><span className={`status-badge ${emp.status.toLowerCase()}`}><span className="status-dot"></span>{emp.status}</span></td>
    <td><ActionMenu onDelete={onDelete} /></td>
  </tr>
);

const DeleteConfirmModal = ({ employee, onClose, onConfirm }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
      <div className="modal-header">
        <h2>Delete Employee?</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div style={{ padding: '20px' }}>
        <p>Are you sure you want to delete <strong>{employee?.name}</strong>?</p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>This action cannot be undone.</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} style={{ background: '#ef4444', color: 'white' }}>Delete</button>
      </div>
    </div>
  </div>
);

const EmployeeDashboardNew = ({ onLogout }) => {
  const { 
    employees, filteredEmployees, loading, error, 
    searchTerm, setSearchTerm, roleFilter, setRoleFilter,
    selected, toggleSelect, toggleSelectAll, addEmployee, inviteEmployee, deleteEmployee, exportToCSV, refresh 
  } = useEmployees();
  
  const [collapsed, setCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleAdd = async (form) => {
    const result = await addEmployee(form);
    if (result.success) alert('Employee deleted!');
    return result;
  };

  const handleInvite = async (form) => {
    const result = await inviteEmployee(form);
    if (result.success) alert('Invitation sent!');
    return result;
  };

  const handleDelete = async () => {
    alert('handleDelete called');
    if (!deleteTarget) {
      alert('No delete target!');
      return;
    }
    alert('Deleting: ' + deleteTarget.name + ' with _id: ' + deleteTarget._id);
    const result = await deleteEmployee(deleteTarget._id);
    alert('Delete result: ' + JSON.stringify(result));
    if (result.success) {
      alert('Employee deleted successfully!');
      setDeleteTarget(null);
    } else {
      alert('Failed to delete: ' + result.message);
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="loading-spinner"></div><p>Loading...</p></div>;
  if (error) return <div className="dashboard-error"><p>{error}</p><button onClick={refresh}>Retry</button></div>;

  return (
    <div className="dashboard-container">
      <Sidebar collapsed={collapsed} />
      
      <main className="main-content">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} onLogout={onLogout} />
        
        <div className="page-content">
          <div className="page-header">
            <h1>Employees</h1>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={16} />Add</button>
              <button className="btn btn-secondary" onClick={() => setShowInvite(true)}><Icon name="mail" size={16} />Invite</button>
              <button className="btn btn-secondary" onClick={exportToCSV}><Icon name="download" size={16} />Export</button>
            </div>
          </div>

          <Filters 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
            roleFilter={roleFilter} setRoleFilter={setRoleFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          />

          <div className="table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={selected.length === filteredEmployees.length && filteredEmployees.length > 0} /></th>
                  <th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Reporting To</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <EmployeeRow 
                    key={emp._id || emp.id} 
                    emp={emp} 
                    selected={selected.includes(emp.id)} 
                    onToggle={() => toggleSelect(emp.id)}
                    onDelete={() => setDeleteTarget(emp)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="no-results">
              <Icon name="search" size={48} />
              <p>No employees found</p>
            </div>
          )}
        </div>
      </main>

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSubmit={handleInvite} />}
      {deleteTarget && <DeleteConfirmModal employee={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
    </div>
  );
};

export default EmployeeDashboardNew;
