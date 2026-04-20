import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { attendanceAPI } from '../services/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [presentCount, setPresentCount] = useState(0);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme === 'dark';
  });

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    // Apply theme to body
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(newDarkMode ? 'dark-theme' : 'light-theme');
  };

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchEmployeesForAttendance();
    // Apply initial theme
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(isDarkMode ? 'dark-theme' : 'light-theme');
  }, []);

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setIsModalOpen(false);
      setSelectedUser(null);
      setIsEditMode(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      fetchUsers();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({ name: '', email: '', password: '', role: 'user' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Mark attendance for employee - Present Today
  const handleMarkPresent = async (employeeId) => {
    try {
      setAttendanceLoading(true);
      const response = await fetch('/api/attendance/admin-mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId,
          status: 'Present',
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to mark attendance');
      }

      alert('✅ Employee marked as Present Today!');
      setIsAttendanceModalOpen(false);
    } catch (err) {
      setError(err.message);
      alert('❌ Error: ' + err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Open attendance modal to VIEW present employees (not mark)
  const openAttendanceModal = async () => {
    setIsAttendanceModalOpen(true);
    await fetchTodaysPresentEmployees();
  };

  // Fetch ONLY today's present employees
  const fetchTodaysPresentEmployees = async () => {
    try {
      setAttendanceLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`/api/attendance/today?date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch today\'s attendance');
      }
      
      const data = await response.json();
      
      // Filter only PRESENT employees from today's attendance data
      // Backend returns employees with attendanceToday object
      const presentOnly = (data.data || []).filter(emp => {
        const att = emp.attendanceToday;
        return att && (att.status === 'Present' || att.isActive === true);
      }).map(emp => ({
        ...emp.attendanceToday,
        employeeId: emp.attendanceToday?.employeeId || { 
          name: emp.name, 
          email: emp.email,
          _id: emp._id 
        }
      }));
      
      setPresentEmployees(presentOnly);
      setPresentCount(presentOnly.length);
      
      console.log(`📊 Found ${presentOnly.length} employees present today`);
      console.log('Present employees:', presentOnly.map(p => p.employeeId?.name || 'Unknown'));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching present employees:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch employees for attendance
  const fetchEmployeesForAttendance = async () => {
    try {
      const response = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && users.length === 0) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  return (
    <div className={`admin-dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-nav">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button className="attendance-btn" onClick={openAttendanceModal}>
            📋 Present Today
          </button>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {activeTab === 'dashboard' && stats && (
        <div className="admin-stats">
          <h2>Overview Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card clickable" onClick={() => setActiveTab('users')}>
              <h3>Total Users</h3>
              <p className="stat-value">{stats.totalUsers}</p>
              <span className="card-hint">Click to manage users</span>
            </div>
            <div className="stat-card admin-card clickable" onClick={() => setActiveTab('users')}>
              <h3>Admins</h3>
              <p className="stat-value">{stats.adminCount}</p>
              <span className="card-hint">Click to manage admins</span>
            </div>
            <div className="stat-card user-card clickable" onClick={() => setActiveTab('users')}>
              <h3>Employees</h3>
              <p className="stat-value">{stats.employeeCount}</p>
              <span className="card-hint">Click to manage users</span>
            </div>
            <div className="stat-card employee-card clickable" onClick={() => window.location.href = '#/employees'}>
              <h3>Total Employees</h3>
              <p className="stat-value">{stats.totalEmployees}</p>
              <span className="card-hint">Click to view employees</span>
            </div>
            <div className="stat-card project-card clickable" onClick={() => window.location.href = '#/projects'}>
              <h3>Total Projects</h3>
              <p className="stat-value">{stats.totalProjects}</p>
              <span className="card-hint">Click to view projects</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-users">
          <div className="users-header">
            <h2>User Management</h2>
            <button className="btn-create" onClick={openCreateModal}>
              + Create New User
            </button>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`role-select ${user.role}`}
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit User */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{isEditMode ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={isEditMode ? handleUpdateUser : handleCreateUser}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!isEditMode && (
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!isEditMode}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-save">
                  {isEditMode ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Viewing Present Today Employees */}
      {isAttendanceModalOpen && (
        <div className="modal-overlay">
          <div className="modal attendance-modal">
            <h3>📋 Employees Present Today ({presentCount})</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '15px' }}>
              Date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <div className="employee-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {attendanceLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <span className="spinner"></span>
                  <p>Loading present employees...</p>
                </div>
              ) : presentEmployees.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  background: '#FEF3C7',
                  borderRadius: '8px',
                  margin: '10px 0'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}></div>
                  <p style={{ color: '#92400E', fontWeight: '600' }}>No employees present yet!</p>
                  <p style={{ color: '#B45309', fontSize: '14px' }}>Check back later...</p>
                </div>
              ) : (
                presentEmployees.map(attendance => (
                  <div key={attendance._id} className="employee-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        fontSize: '18px', 
                        fontWeight: '700',
                        color: '#065F46',
                        background: 'white',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        textTransform: 'uppercase'
                      }}>
                        {(attendance.employeeId?.name || attendance.userId?.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <span className="employee-name" style={{ 
                          fontWeight: '600', 
                          color: '#065F46',
                          display: 'block'
                        }}>
                          {attendance.employeeId?.name || attendance.userId?.name || 'Unknown'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#059669' }}>
                          {attendance.employeeId?.email || attendance.userId?.email || ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        background: '#10B981',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✅ Present
                      </span>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6B7280',
                        marginTop: '4px'
                      }}>
                        Check-in: {attendance.checkInTime ? 
                          new Date(attendance.checkInTime).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '--:--'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setIsAttendanceModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
              <button 
                type="button"
                onClick={fetchTodaysPresentEmployees}
                disabled={attendanceLoading}
                style={{
                  padding: '10px 20px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: attendanceLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: attendanceLoading ? 0.7 : 1
                }}
              >
                {attendanceLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
