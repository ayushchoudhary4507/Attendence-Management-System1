import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import './EmployeeWorkHours.css';

const EmployeeWorkHours = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalWorkHours: 0,
    averageHours: 0,
    activeEmployees: 0
  });

  // Get current logged-in user
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    fetchWorkHours();
  }, [selectedDate, currentUser]);

  const fetchWorkHours = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if selected date is today
      const today = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === today;
      
      // Use date-based API for historical dates, today API for current date
      const response = isToday 
        ? await attendanceAPI.getTodayAttendanceStatus()
        : await attendanceAPI.getAttendanceByDate(selectedDate);
      
      console.log('Work Hours API Response:', response);
      if (response.success) {
        const employeesData = response.data || [];
        
        // For historical dates, map the data differently
        if (!isToday) {
          employeesData.forEach(emp => {
            emp.isCurrentUser = emp.email === currentUser?.email;
            // Use attendanceStatus from API
            emp.displayStatus = emp.attendanceStatus || 'inactive';
            // Map attendanceData to attendanceToday for consistency
            emp.attendanceToday = emp.attendanceData;
            emp.checkInTime = emp.attendanceData?.checkInTime;
            emp.checkOutTime = emp.attendanceData?.checkOutTime;
          });
        } else {
          // Mark current user as "You" and set status based on actual attendance data from API
          const userEmail = currentUser?.email;
          employeesData.forEach(emp => {
            // Check if this is the current logged-in user
            emp.isCurrentUser = emp.email === userEmail;
            
            // Use the attendanceStatus from API (active if checked in, inactive if not)
            emp.displayStatus = emp.attendanceStatus || 'inactive';
            
            // Calculate dynamic hours for active employees who have checked in
            if (emp.displayStatus === 'active' && emp.checkInTime && !emp.checkOutTime) {
              const checkIn = new Date(emp.checkInTime);
              const now = new Date();
              emp.dynamicWorkHours = (now - checkIn) / (1000 * 60 * 60); // hours
            }
          });
        }
        
        // Sort: Current user first, then others
        employeesData.sort((a, b) => {
          if (a.isCurrentUser && !b.isCurrentUser) return -1;
          if (!a.isCurrentUser && b.isCurrentUser) return 1;
          return 0;
        });
        
        setEmployees(employeesData);
        
        // Calculate stats including dynamic hours
        const totalHours = employeesData.reduce((sum, emp) => 
          sum + (emp.attendanceToday?.workHours || emp.dynamicWorkHours || 0), 0);
        const activeCount = employeesData.filter(emp => 
          emp.displayStatus === 'active' || emp.attendanceData?.status === 'Present').length;
        const presentCount = employeesData.filter(emp => 
          emp.attendanceToday?.status === 'Present' || emp.attendanceData?.status === 'Present').length;
        
        setStats({
          totalEmployees: employeesData.length,
          totalWorkHours: totalHours.toFixed(1),
          averageHours: employeesData.length > 0 ? (totalHours / employeesData.length).toFixed(1) : 0,
          activeEmployees: isToday ? activeCount : presentCount
        });
      } else {
        setError(response.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching work hours:', error);
      setError(error.message || 'Failed to fetch work hours data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (hours, checkInTime, isActive) => {
    if (!hours || hours === 0) {
      // Calculate hours dynamically for active employees
      if (isActive && checkInTime) {
        const checkIn = new Date(checkInTime);
        const now = new Date();
        const diffMs = now - checkIn;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
      }
      return '-';
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="work-hours-container">
        <div className="loading-spinner">Loading work hours...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="work-hours-container">
        <div className="error-message" style={{color: 'red', padding: '20px', textAlign: 'center'}}>
          <p>Error: {error}</p>
          <button onClick={fetchWorkHours} style={{marginTop: '10px', padding: '8px 16px'}}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="work-hours-container">
      <div className="work-hours-header">
        <h2>Employee Work Hours - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
        <div className="date-selector">
          <label>Select Date:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="today-btn"
            style={{
              marginLeft: '10px',
              padding: '6px 12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalEmployees}</span>
          <span className="stat-label">Total Employees</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.activeEmployees}</span>
          <span className="stat-label">Active Now</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalWorkHours}h</span>
          <span className="stat-label">Total Hours</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.averageHours}h</span>
          <span className="stat-label">Avg Hours</span>
        </div>
      </div>

      {/* Work Hours Table */}
      <div className="work-hours-table-container">
        <table className="work-hours-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Work Hours</th>
              <th>Attendance Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp._id} className={`${emp.displayStatus === 'active' ? 'active-row' : ''} ${emp.isCurrentUser ? 'current-user-row' : ''}`}>
                <td>
                  <div className="employee-cell">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=${emp.isCurrentUser ? '10B981' : '4F46E5'}&color=fff`} 
                      alt={emp.name} 
                      className="employee-avatar-small"
                    />
                    <div className="employee-info-small">
                      <span className="employee-name">
                        {emp.name}
                        {emp.isCurrentUser && <span className="you-badge"> (You)</span>}
                      </span>
                      <span className="employee-designation">{emp.designation}</span>
                    </div>
                  </div>
                </td>
                <td className="employee-id">{emp.employeeId}</td>
                <td>
                  <span className={`status-badge ${emp.displayStatus === 'active' ? 'active' : 'inactive'} ${emp.isCurrentUser ? 'current-user' : ''}`}>
                    {emp.displayStatus === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </td>
                <td>{formatTime(emp.checkInTime)}</td>
                <td>{formatTime(emp.checkOutTime)}</td>
                <td>
                  <span className={`work-hours-badge ${emp.attendanceToday?.workHours > 0 || emp.displayStatus === 'active' ? 'has-hours' : ''} ${emp.isCurrentUser ? 'current-user-hours' : ''}`}>
                    {formatDuration(emp.attendanceToday?.workHours, emp.checkInTime, emp.displayStatus === 'active')}
                  </span>
                </td>
                <td>
                  {emp.attendanceToday ? (
                    <span className={`attendance-status ${emp.attendanceToday.status?.toLowerCase().replace(' ', '-')}`}>
                      {emp.attendanceToday.status}
                    </span>
                  ) : (
                    <span className="attendance-status absent">Not Marked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {employees.length === 0 && (
          <div className="empty-state" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            <p>No employee data found</p>
            <p style={{fontSize: '14px', marginTop: '10px'}}>
              {stats.totalEmployees === 0 ? 'Make sure you have marked attendance today.' : 'No records available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeWorkHours;
