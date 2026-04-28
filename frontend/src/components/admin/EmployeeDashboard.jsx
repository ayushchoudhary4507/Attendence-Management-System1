import React, { useState } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import EmployeeSidebar from '../sidebar/employee/EmployeeSidebar';
import { Icon } from '../../common/Icon';
import { AddEmployeeModal, InviteModal } from '../../common/EmployeeModals';
import './EmployeeDashboard.css';

const ROLE_OPTIONS = ['All', 'Employee', 'Interns', 'Manager'];
const DESIGNATION_OPTIONS = ['All', 'Software Development', 'Intern', 'Manager'];

// Sub-components
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
      </div>
      <div className="user-menu">
        <button className="icon-btn"><Icon name="search" /></button>
        <button className="icon-btn"><Icon name="bell" /><span className="badge">76</span></button>
      </div>
      <div className="user-menu">
       <img src="https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff" alt="User" className="user-avatar" />
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  </header>
);

const Filters = ({ searchTerm, setSearchTerm, roleFilter, setRoleFilter }) => (
  <div className="filters-bar">
    <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r === 'All' ? 'All Employees' : r}</option>)}
    </select>
    <select className="filter-select" value="All" onChange={() => {}}>
      {DESIGNATION_OPTIONS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Designations' : d}</option>)}
    </select>
    <div className="search-box">
      <Icon name="search" size={18} className="search-icon" />
      <input type="text" placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
    </div>
    <button className="filter-btn"><Icon name="filter" size={18} />Filters</button>
  </div>
);

const EmployeeRow = ({ emp, selected, onToggle }) => (
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
    <td><button className="action-btn"><Icon name="more" size={18} /></button></td>
  </tr>
);

const LoadingState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: 50, height: 50, border: '5px solid #f3f3f3', borderTop: '5px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <p style={{ marginTop: 20, color: '#666' }}>Loading from MongoDB Atlas...</p>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <p style={{ color: 'red', marginBottom: 20 }}>{error}</p>
    <button onClick={onRetry} style={{ padding: '10px 20px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Retry</button>
  </div>
);

// Main Component
const EmployeeDashboard = ({ onLogout }) => {
  const { employees, filteredEmployees, loading, error, searchTerm, setSearchTerm, roleFilter, setRoleFilter, selected, toggleSelect, toggleSelectAll, addEmployee, inviteEmployee, exportToCSV, refresh } = useEmployees();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const handleAdd = async (form) => {
    const result = await addEmployee(form);
    if (result.success) alert('Employee saved to MongoDB Atlas!');
    return result;
  };

  const handleInvite = async (form) => {
    const result = await inviteEmployee(form);
    if (result.success) alert('Invitation sent!');
    return result;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div className="dashboard-container">
      <EmployeeSidebar collapsed={collapsed} activeTab={activeTab} onNavigate={setActiveTab} />
      
      <main className="main-content">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} onLogout={onLogout} />
        
        <div className="page-content">
          <div className="page-header">
            <h1>Employees ({employees.length})</h1>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={16} />Add</button>
              <button className="btn btn-secondary" onClick={() => setShowInvite(true)}><Icon name="mail" size={16} />Invite</button>
              <button className="btn btn-secondary" onClick={exportToCSV}><Icon name="download" size={16} />Export</button>
            </div>
          </div>

          <div style={{ padding: 10, background: '#d1fae5', borderRadius: 8, marginBottom: 20, color: '#065f46' }}>
            ✅ Connected to MongoDB Atlas
          </div>

          <Filters searchTerm={searchTerm} setSearchTerm={setSearchTerm} roleFilter={roleFilter} setRoleFilter={setRoleFilter} />

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
                  <EmployeeRow key={emp._id || emp.id} emp={emp} selected={selected.includes(emp.id)} onToggle={() => toggleSelect(emp.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="no-results">
              <Icon name="search" size={48} />
              <p>No employees found</p>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 20 }}>Add First Employee</button>
            </div>
          )}
        </div>
      </main>

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSubmit={handleInvite} />}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EmployeeDashboard;
