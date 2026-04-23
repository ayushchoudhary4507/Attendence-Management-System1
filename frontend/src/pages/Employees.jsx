import React, { useState, useEffect } from 'react';
import '../components/EmployeeDashboard.css';
import './Employees.css';
import { attendanceAPI, API_BASE_URL } from '../services/api';

const API_URL = 'https://attendence-management-system1.onrender.com/api';

// Role badge colors
const ROLE_COLORS = {
  'Interns': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  'Employee': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  'Manager': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  'Admin': { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
  'IT': { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' },
  'Sales': { bg: '#FCE7F3', text: '#BE185D', border: '#F9A8D4' },
  'Marketing': { bg: '#F3E8FF', text: '#7C3AED', border: '#C4B5FD' },
  'HR': { bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74' }
};

// Avatar colors based on initials
const AVATAR_COLORS = [
  '4F46E5', // Indigo
  '0891B2', // Cyan
  '10B981', // Emerald
  'F59E0B', // Amber
  'EF4444', // Red
  '8B5CF6', // Violet
  'EC4899', // Pink
  '14B8A6', // Teal
  'F97316', // Orange
  '6366F1', // Indigo
];

const getAvatarColor = (name) => {
  if (!name) return '4F46E5';
  const charCode = name.charCodeAt(0);
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

const Employees = ({ onLogout, userRole }) => {
  const isAdmin = userRole === 'admin';
  const isEmployee = userRole === 'employee';
  
  // Get current logged in user info
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(10);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [dateJoinedFilter, setDateJoinedFilter] = useState('');
  const [bulkActionDropdown, setBulkActionDropdown] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    designation: '',
    role: '',
    reportingTo: '',
    employeeId: ''
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    role: '',
    message: ''
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    designation: '',
    role: '',
    reportingTo: '',
    status: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch attendance and leave status for all employees
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      if (employees.length === 0) return;
      
      try {
        const [attendanceData, leavesData] = await Promise.all([
          attendanceAPI.getTodayAttendanceStatus(),
          attendanceAPI.getAllLeaves('Approved')
        ]);
        
        // Create a map of employee ID to leave status
        const leaveMap = {};
        if (leavesData.success && leavesData.data) {
          const today = new Date().toISOString().split('T')[0];
          leavesData.data.forEach(leave => {
            const start = new Date(leave.startDate).toISOString().split('T')[0];
            const end = new Date(leave.endDate).toISOString().split('T')[0];
            if (today >= start && today <= end) {
              leaveMap[leave.employeeId?._id || leave.employeeId] = 'On Leave';
            }
          });
        }
        
        // Create attendance status map
        const statusMap = {};
        if (attendanceData.success && attendanceData.data) {
          attendanceData.data.forEach(emp => {
            const empId = emp._id;
            // Check if on leave first
            if (leaveMap[empId]) {
              statusMap[empId] = 'On Leave';
            } else {
              const hasAttendance = emp.attendanceToday && emp.attendanceToday.status === 'Present';
              statusMap[empId] = hasAttendance ? 'Present' : 'Absent';
            }
          });
        }
        
        setAttendanceStatus(statusMap);
      } catch (err) {
        console.error('Error fetching attendance status:', err);
      }
    };

    fetchAttendanceStatus();
    const interval = setInterval(fetchAttendanceStatus, 30000);
    return () => clearInterval(interval);
  }, [employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      if (!token) {
        setError('Not authenticated. Please login.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/#/login';
        }, 2000);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        const allEmployees = data.data.map(emp => ({
          id: emp.employeeId,
          _id: emp._id,
          name: emp.name,
          designation: emp.designation,
          email: emp.email,
          role: emp.role,
          reportingTo: emp.reportingTo,
          status: emp.status
        }));
        
        // Filter employees based on role
        let filteredData = allEmployees;
        if (isEmployee && currentUser?.email) {
          // Employee sees only their own record (matched by email)
          filteredData = allEmployees.filter(emp => 
            emp.email?.toLowerCase() === currentUser.email?.toLowerCase()
          );
        }
        // Admin sees all employees (no filter)
        
        setEmployees(filteredData);
        setFilteredEmployees(filteredData);
      } else {
        setError('Failed to fetch employees');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = employees;
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.includes(searchTerm)
      );
    }
    if (roleFilter !== 'All') {
      filtered = filtered.filter(emp => emp.role === roleFilter);
    }
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(emp => emp.designation === departmentFilter);
    }
    if (dateJoinedFilter) {
      filtered = filtered.filter(emp => {
        if (!emp.createdAt) return true;
        const joinDate = new Date(emp.createdAt).toISOString().split('T')[0];
        return joinDate >= dateJoinedFilter;
      });
    }
    setFilteredEmployees(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, roleFilter, departmentFilter, dateJoinedFilter, employees]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(empId => empId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handleAddEmployeeSubmit = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmployee)
      });
      const data = await response.json();
      if (data.success) {
        await fetchEmployees();
        setShowAddModal(false);
        setNewEmployee({ name: '', email: '', designation: '', role: '', reportingTo: '', employeeId: '' });
        alert('Employee added successfully to MongoDB Atlas!');
      } else {
        alert(data.message || 'Failed to add employee');
      }
    } catch (err) {
      alert('Failed to add employee');
    }
  };

  const handleInviteSubmit = async () => {
    try {
      const response = await fetch(`${API_URL}/employees/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });
      const data = await response.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteData({ email: '', role: '', message: '' });
        alert('Invitation sent successfully!');
      } else {
        alert(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      alert('Failed to send invitation');
    }
  };

  const handleEditEmployee = async () => {
    if (!editTarget) return;
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employees/${editTarget._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Employee updated successfully!');
        fetchEmployees();
        setShowEditModal(false);
        setEditTarget(null);
      } else {
        alert(data.message || 'Failed to update employee');
      }
    } catch (err) {
      alert('Failed to update employee');
    }
  };

  const openEditModal = (employee) => {
    setEditTarget(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
      role: employee.role,
      reportingTo: employee.reportingTo,
      status: employee.status
    });
    setShowEditModal(true);
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      alert('Only admin can perform bulk actions');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedEmployees.length} employees?`)) return;
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const promises = selectedEmployees.map(id => 
        fetch(`${API_URL}/employees/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
      await Promise.all(promises);
      alert(`${selectedEmployees.length} employees deleted successfully!`);
      setSelectedEmployees([]);
      fetchEmployees();
    } catch (err) {
      alert('Failed to delete employees');
    }
  };

  const handleBulkChangeDepartment = async (department) => {
    if (!isAdmin) {
      alert('Only admin can perform bulk actions');
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const promises = selectedEmployees.map(id => 
        fetch(`${API_URL}/employees/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ designation: department })
        })
      );
      await Promise.all(promises);
      alert(`Department updated for ${selectedEmployees.length} employees!`);
      setSelectedEmployees([]);
      setBulkActionDropdown(false);
      fetchEmployees();
    } catch (err) {
      alert('Failed to update departments');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employees/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        alert('Employee deleted successfully!');
        fetchEmployees();
        setDeleteTarget(null);
      } else {
        alert(data.message || 'Failed to delete employee');
      }
    } catch (err) {
      alert('Failed to delete employee');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget || !newPassword) return;
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employees/${resetPasswordTarget._id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Password reset successfully for ${resetPasswordTarget.name}!`);
        setShowResetPasswordModal(false);
        setResetPasswordTarget(null);
        setNewPassword('');
      } else {
        alert(data.message || 'Failed to reset password');
      }
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const handleDeactivateEmployee = async (employee) => {
    if (!isAdmin) {
      alert('Only admin can deactivate employees');
      return;
    }
    
    const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employees/${employee._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        alert(`${employee.name} is now ${newStatus}!`);
        fetchEmployees();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Failed to update employee status');
    }
  };

  // Pagination logic
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleMarkAttendance = async (employee) => {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user'));
      
      // Check if user is marking their own attendance
      const isOwnAttendance = currentUser?.email === employee.email;
      
      // Mark attendance
      const data = await attendanceAPI.markAttendance('Present', '');
      
      if (data.success) {
        // Show different message for own attendance vs admin marking
        if (isOwnAttendance) {
          alert(`✅ Attendance marked successfully!\n\n📧 Message sent to admin.`);
        } else {
          alert(`✅ Attendance marked for ${employee.name}!`);
        }
        fetchEmployees(); // Refresh the list
      } else {
        alert(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      alert('Error marking attendance: ' + err.message);
    }
  };

  const handleExport = (format = 'csv') => {
    if (format === 'csv') {
      const csvContent = [
        ['Employee ID', 'Name', 'Designation', 'Email', 'User Role', 'Reporting To', 'Status', 'Department'].join(','),
        ...employees.map(emp => [emp.id, emp.name, emp.designation, emp.email, emp.role, emp.reportingTo, emp.status, emp.department || 'N/A'].join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      // Excel export logic (same as CSV for now, can be enhanced)
      handleExport('csv');
    } else if (format === 'pdf') {
      alert('PDF export coming soon!');
    }
    setShowExportDropdown(false);
  };

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading employees from MongoDB Atlas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchEmployees} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1>Employees ({employees.length})</h1>
        <div className="page-actions">
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add Employee
              </button>
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                Invite Employee
              </button>
            </>
          )}
          <button className="btn btn-secondary export-dropdown-btn" onClick={() => setShowExportDropdown(!showExportDropdown)} style={{position: 'relative'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export
            {showExportDropdown && (
              <div className="export-dropdown" style={{position: 'absolute', top: '100%', right: 0, background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', padding: '8px 0', minWidth: '150px', zIndex: 100}}>
                <button onClick={() => handleExport('csv')} style={{display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer'}}>Export as CSV</button>
                <button onClick={() => handleExport('excel')} style={{display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer'}}>Export as Excel</button>
                <button onClick={() => handleExport('pdf')} style={{display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer'}}>Export as PDF</button>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedEmployees.length > 0 && (
        <div className="bulk-actions-bar" style={{display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', background: '#FEF3C7', borderRadius: '8px', marginBottom: '15px'}}>
          <span style={{fontWeight: 500, color: '#92400E'}}>{selectedEmployees.length} selected</span>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn btn-sm" onClick={() => handleBulkDelete()} style={{padding: '6px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'}}>
              Delete Selected
            </button>
            <div style={{position: 'relative'}}>
              <button className="btn btn-sm" onClick={() => setBulkActionDropdown(!bulkActionDropdown)} style={{padding: '6px 12px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'}}>
                Change Department
              </button>
              {bulkActionDropdown && (
                <div className="bulk-dropdown" style={{position: 'absolute', top: '100%', left: 0, background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', padding: '8px 0', minWidth: '180px', zIndex: 100, marginTop: '4px'}}>
                  {['Software Development', 'IT', 'HR', 'Sales', 'Marketing'].map(dept => (
                    <button key={dept} onClick={() => handleBulkChangeDepartment(dept)} style={{display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px'}}>
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="connection-status">
        ✅ Connected to MongoDB Atlas - Employee data is stored in cloud database
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Employees</option>
            <option value="Employee">Employee</option>
            <option value="Interns">Interns</option>
            <option value="Manager">Manager</option>
            <option value="IT">IT</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="HR">HR</option>
          </select>
        </div>
        <div className="filter-group">
          <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="All">All Departments</option>
            <option value="Software Development">Software Development</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>
        <div className="filter-group">
          <input 
            type="date" 
            className="filter-select" 
            value={dateJoinedFilter} 
            onChange={(e) => setDateJoinedFilter(e.target.value)}
            placeholder="Date Joined"
          />
        </div>
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="table-container desktop-table">
        <table className="employees-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input type="checkbox" onChange={handleSelectAll} checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0} />
              </th>
              <th>S.No.</th>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>User Role</th>
              <th>Reporting To</th>
              <th>Attendance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.map((employee, index) => (
              <tr key={employee._id || employee.id}>
                <td><input type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={() => handleSelectEmployee(employee.id)} /></td>
                <td className="serial-number">{(currentPage - 1) * employeesPerPage + index + 1}</td>
                <td className="employee-id">{employee.id}</td>
                <td>
                  <div className="employee-info" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${getAvatarColor(employee.name)} 0%, ${ROLE_COLORS[employee.role]?.text || '#7C3AED'} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                      <span className="employee-name" style={{fontWeight: '600', fontSize: '14px'}}>{employee.name}</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span className="employee-designation" style={{fontSize: '12px', color: '#6B7280'}}>{employee.designation}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: attendanceStatus[employee._id] === 'Present' ? '#D1FAE5' : '#FEE2E2',
                          color: attendanceStatus[employee._id] === 'Present' ? '#065F46' : '#DC2626'
                        }}>
                          {attendanceStatus[employee._id] === 'Present' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="email-col">{employee.email}</td>
                <td><span className={`role-badge ${employee.role?.toLowerCase() || 'employee'}`} style={{background: ROLE_COLORS[employee.role]?.bg || '#DBEAFE', color: ROLE_COLORS[employee.role]?.text || '#1E40AF', border: `1px solid ${ROLE_COLORS[employee.role]?.border || '#93C5FD'}`}}>{employee.role || 'Employee'}</span></td>
                <td>{employee.reportingTo}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <button 
                      className="attendance-btn"
                      onClick={() => handleMarkAttendance(employee)}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      Mark Attendance
                    </button>
                    {attendanceStatus[employee._id] && (
                      <span style={{
                        padding: '3px 8px',
                        background: attendanceStatus[employee._id] === 'Present' ? '#D1FAE5' : attendanceStatus[employee._id] === 'On Leave' ? '#FEF3C7' : '#FEE2E2',
                        color: attendanceStatus[employee._id] === 'Present' ? '#065F46' : attendanceStatus[employee._id] === 'On Leave' ? '#92400E' : '#991B1B',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {attendanceStatus[employee._id] === 'Present' ? '✓ Present' : attendanceStatus[employee._id] === 'On Leave' ? ' On Leave' : '✗ Absent'}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {isAdmin ? (
                    <div className="action-buttons" style={{position: 'relative'}}>
                      <button className="action-btn" onClick={() => setActiveDropdown(activeDropdown === employee._id ? null : employee._id)} style={{padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px'}} title="More Actions">
                        ⋮
                      </button>
                      {activeDropdown === employee._id && (
                        <div className="action-dropdown" style={{position: 'absolute', top: '100%', right: 0, background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', padding: '8px 0', minWidth: '160px', zIndex: 100, marginTop: '4px'}}>
                          <button onClick={() => {openEditModal(employee); setActiveDropdown(null);}} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            Edit Profile
                          </button>
                          <button onClick={() => {handleDeactivateEmployee(employee); setActiveDropdown(null);}} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: employee.status === 'Active' ? '#EF4444' : '#10B981'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            {employee.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => {setResetPasswordTarget(employee); setShowResetPasswordModal(true); setActiveDropdown(null);}} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2H8v4h4v-1h4v-3c0-2.21-1.79-4-4-4z"/></svg>
                            Reset Password
                          </button>
                          <div style={{borderTop: '1px solid #E5E7EB', margin: '4px 0'}}></div>
                          <button onClick={() => {setDeleteTarget(employee); setActiveDropdown(null);}} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#EF4444'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="view-only-badge">View Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="mobile-cards-container">
        {currentEmployees.map((employee, index) => (
          <div className="employee-mobile-card" key={employee._id || employee.id}>
            <div className="employee-card-header">
              <div className="employee-card-avatar" style={{
                background: `linear-gradient(135deg, ${getAvatarColor(employee.name)} 0%, ${ROLE_COLORS[employee.role]?.text || '#7C3AED'} 100%)`
              }}>
                {employee.name?.charAt(0).toUpperCase()}
              </div>
              <div className="employee-card-info">
                <h4 className="employee-card-name">{employee.name}</h4>
                <p className="employee-card-designation">{employee.designation}</p>
              </div>
              <span className={`employee-card-status ${attendanceStatus[employee._id] === 'Present' ? 'active' : 'inactive'}`}>
                {attendanceStatus[employee._id] === 'Present' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="employee-card-details">
              <div className="employee-card-row">
                <span className="card-label">ID:</span>
                <span className="card-value">{employee.id}</span>
              </div>
              <div className="employee-card-row">
                <span className="card-label">Email:</span>
                <span className="card-value">{employee.email}</span>
              </div>
              <div className="employee-card-row">
                <span className="card-label">Role:</span>
                <span className="card-value">
                  <span className="role-badge-mobile" style={{background: ROLE_COLORS[employee.role]?.bg || '#DBEAFE', color: ROLE_COLORS[employee.role]?.text || '#1E40AF'}}>
                    {employee.role || 'Employee'}
                  </span>
                </span>
              </div>
              <div className="employee-card-row">
                <span className="card-label">Reports To:</span>
                <span className="card-value">{employee.reportingTo || '-'}</span>
              </div>
              {attendanceStatus[employee._id] && (
                <div className="employee-card-row">
                  <span className="card-label">Attendance:</span>
                  <span className={`attendance-badge-mobile ${attendanceStatus[employee._id].toLowerCase().replace(' ', '-')}`}>
                    {attendanceStatus[employee._id] === 'Present' ? '✓ Present' : attendanceStatus[employee._id] === 'On Leave' ? 'On Leave' : '✗ Absent'}
                  </span>
                </div>
              )}
            </div>
            <div className="employee-card-actions">
              {isAdmin ? (
                <>
                  <button className="card-action-btn edit" onClick={() => openEditModal(employee)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    Edit
                  </button>
                  <button className="card-action-btn attendance" onClick={() => handleMarkAttendance(employee)}>
                    Mark
                  </button>
                  <button className="card-action-btn reset" onClick={() => {setResetPasswordTarget(employee); setShowResetPasswordModal(true);}}>
                    Reset
                  </button>
                  <button className="card-action-btn delete" onClick={() => setDeleteTarget(employee)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </>
              ) : (
                <span className="view-only-badge">View Only</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filteredEmployees.length > employeesPerPage && (
        <div className="pagination" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '15px'}}>
          <button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            style={{padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: currentPage === 1 ? '#F3F4F6' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'}}
          >
            Previous
          </button>
          
          {Array.from({length: totalPages}, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => paginate(number)}
              style={{
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                background: currentPage === number ? '#4F46E5' : 'white',
                color: currentPage === number ? 'white' : '#374151',
                cursor: 'pointer'
              }}
            >
              {number}
            </button>
          ))}
          
          <button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            style={{padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: currentPage === totalPages ? '#F3F4F6' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'}}
          >
            Next
          </button>
        </div>
      )}

      {filteredEmployees.length === 0 && (
        <div className="no-results no-results-container" style={{textAlign: 'center', padding: '60px 20px', background: '#F9FAFB', borderRadius: '12px', marginTop: '20px'}}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="#D1D5DB" style={{marginBottom: '16px'}}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <h3 style={{color: '#374151', marginBottom: '8px', fontSize: '18px'}}>No employees found</h3>
          <p style={{color: '#6B7280', marginBottom: '20px'}}>Try adjusting your search or filters</p>
          {isAdmin && (
            <button className="btn btn-primary no-results-btn" onClick={() => setShowAddModal(true)} style={{padding: '10px 20px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
              Add First Employee
            </button>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Employee</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="employee-form" onSubmit={(e) => { e.preventDefault(); handleAddEmployeeSubmit(); }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" placeholder="Enter full name" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" placeholder="Enter email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Designation *</label>
                    <select value={newEmployee.designation} onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="Intern">Intern</option>
                      <option value="Software Development">Software Development</option>
                      <option value="Manager">Manager</option>
                      <option value="Sales Representative">Sales Representative</option>
                      <option value="Sales Manager">Sales Manager</option>
                      <option value="HR Executive">HR Executive</option>
                      <option value="HR Manager">HR Manager</option>
                      <option value="IT Support">IT Support</option>
                      <option value="IT Manager">IT Manager</option>
                      <option value="Marketing Executive">Marketing Executive</option>
                      <option value="Marketing Manager">Marketing Manager</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="Employee">Employee</option>
                      <option value="Interns">Interns</option>
                      <option value="Manager">Manager</option>
                      <option value="IT">IT</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reporting To *</label>
                    <input type="text" placeholder="Manager name" value={newEmployee.reportingTo} onChange={(e) => setNewEmployee({ ...newEmployee, reportingTo: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Employee ID (Optional)</label>
                    <input type="text" placeholder="Auto-generated" value={newEmployee.employeeId} onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })} />
                  </div>
                </div>
                <div className="form-info-box">
                  💾 Will be saved to MongoDB Atlas
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save to Atlas</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Employee</h2>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="employee-form" onSubmit={(e) => { e.preventDefault(); handleInviteSubmit(); }}>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select value={inviteData.role} onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })} required>
                    <option value="">Select</option>
                    <option value="Employee">Employee</option>
                    <option value="Interns">Interns</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea value={inviteData.message} onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}></textarea>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">send</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Employee</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="employee-form" onSubmit={(e) => { e.preventDefault(); handleEditEmployee(); }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Designation *</label>
                    <select value={editFormData.designation} onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="Intern">Intern</option>
                      <option value="Software Development">Software Development</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="Employee">Employee</option>
                      <option value="Interns">Interns</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reporting To *</label>
                    <input type="text" value={editFormData.reportingTo} onChange={(e) => setEditFormData({ ...editFormData, reportingTo: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Status *</label>
                    <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Employee</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Employee?</h2>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="delete-modal-content">
              <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
              <p className="delete-modal-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary delete-btn-danger" onClick={handleDeleteEmployee}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
