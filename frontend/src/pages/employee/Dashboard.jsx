import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TaskManager from '../../components/admin/TaskManager';
import MyTasks from '../../components/employee/MyTasks';
import AdminLeavePopup from '../../components/admin/AdminLeavePopup';
import { attendanceAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import '../../components/admin/TaskManager.css';
import '../../components/employee/MyTasks.css';
import './Dashboard.css';

const API_URL = import.meta.env.PROD
  ? 'https://attendence-management-system1.onrender.com/api'
  : 'http://127.0.0.1:5005/api';

const Dashboard = ({ onLogout, userRole }) => {
  const navigate = useNavigate();
  
  // Get current logged in user info
  const [currentUser, setCurrentUser] = useState(null);
  
  const effectiveRole = currentUser?.role?.toLowerCase() || userRole?.toLowerCase() || 'employee';
  const isAdmin = effectiveRole === 'admin';
  const isEmployee = !isAdmin;
  
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
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    interns: 0,
    managers: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0
  });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    totalWorkHours: 0,
    activeNow: 0
  });
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceModalTitle, setAttendanceModalTitle] = useState('');
  const [attendanceModalFilter, setAttendanceModalFilter] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [totalLeavesCount, setTotalLeavesCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    designation: '',
    role: '',
    reportingTo: '',
    employeeId: ''
  });

  // Clock In / Clock Out state
  const [myTodayAttendance, setMyTodayAttendance] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  const [workSummaryModal, setWorkSummaryModal] = useState({
    show: false,
    hours: 0,
    minutes: 0,
    totalHoursFormatted: '',
    checkInStr: '',
    checkOutStr: ''
  });

  // Live timer for active clock in
  useEffect(() => {
    let timer;
    if (myTodayAttendance && myTodayAttendance.checkInTime && !myTodayAttendance.checkOutTime) {
      const updateElapsed = () => {
        const checkIn = new Date(myTodayAttendance.checkInTime);
        const now = new Date();
        const diffMs = Math.max(0, now - checkIn);
        const totalMins = Math.floor(diffMs / (1000 * 60));
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        setElapsedTime(`${h}h ${m}m`);
      };
      updateElapsed();
      timer = setInterval(updateElapsed, 30000);
    } else {
      setElapsedTime('');
    }
    return () => clearInterval(timer);
  }, [myTodayAttendance]);

  // Handle Clock In
  const handleClockIn = async () => {
    try {
      setClockLoading(true);
      setApiError(null);
      const res = await attendanceAPI.markAttendance('Present', 'Clocked in from Dashboard');
      if (res && (res.success || res.data)) {
        setMyTodayAttendance(res.data);
      }
      await fetchDashboardData();
    } catch (err) {
      console.error('Clock in error:', err);
      setApiError(err.message || 'Failed to clock in');
    } finally {
      setClockLoading(false);
    }
  };

  // Handle Clock Out & Show Work Time Summary
  const handleClockOut = async () => {
    try {
      setClockLoading(true);
      setApiError(null);
      const res = await attendanceAPI.checkOut();
      if (res && res.data) {
        setMyTodayAttendance(res.data);

        const checkInDate = new Date(res.data.checkInTime);
        const checkOutDate = new Date(res.data.checkOutTime || Date.now());
        const diffMs = Math.max(0, checkOutDate - checkInDate);
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const checkInStr = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const checkOutStr = checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const formattedWorkTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;

        setWorkSummaryModal({
          show: true,
          hours,
          minutes,
          totalHoursFormatted: formattedWorkTime,
          checkInStr,
          checkOutStr
        });
      }
      await fetchDashboardData();
    } catch (err) {
      console.error('Clock out error:', err);
      setApiError(err.message || 'Failed to clock out');
    } finally {
      setClockLoading(false);
    }
  };

  // Centralized theme
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh attendance data every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing attendance data...');
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch attendance status for all employees
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      if (allEmployees.length === 0) return;
      
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch('/api/attendance/today-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          const statusMap = {};
          data.data.forEach(emp => {
            const hasAttendance = emp.attendanceToday && emp.attendanceToday.status === 'Present';
            statusMap[emp._id] = hasAttendance ? 'Present' : 'Absent';
          });
          setAttendanceStatus(statusMap);
        }
      } catch (err) {
        console.error('Error fetching attendance status:', err);
      }
    };

    fetchAttendanceStatus();
    const interval = setInterval(fetchAttendanceStatus, 30000);
    return () => clearInterval(interval);
  }, [allEmployees]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Dashboard: Starting data fetch...');
      
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'Found' : 'Not found');
      
      if (!token) {
        console.error('❌ No authentication token');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const leavesEndpoint = isAdmin ? `${API_URL}/attendance/leave/all` : `${API_URL}/attendance/leave/my-leaves`;
      const [empRes, projRes, leaveRes, myAttRes] = await Promise.all([
        fetch(`${API_URL}/employees`, { headers }),
        fetch(`${API_URL}/projects`, { headers }),
        fetch(leavesEndpoint, { headers }).catch(err => ({ ok: false })),
        !isAdmin ? fetch(`${API_URL}/attendance/my-today`, { headers }).catch(err => ({ ok: false })) : Promise.resolve(null)
      ]);

      // Handle 401 - token invalid/expired
      if (empRes.status === 401 || projRes.status === 401) {
        console.warn('🔒 Token invalid or expired, clearing auth data');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
      }

      // Check if responses are ok
      if (!empRes.ok) {
        throw new Error(`Employees API error: ${empRes.status} ${empRes.statusText}`);
      }
      if (!projRes.ok) {
        throw new Error(`Projects API error: ${projRes.status} ${projRes.statusText}`);
      }

      const empData = await empRes.json();
      const projData = await projRes.json();

      if (myAttRes && myAttRes.ok) {
        try {
          const myAttData = await myAttRes.json();
          if (myAttData.success && myAttData.data) {
            setMyTodayAttendance(myAttData.data);
          } else {
            setMyTodayAttendance(null);
          }
        } catch (e) {
          console.error('Error parsing my-today attendance:', e);
        }
      }

      if (leaveRes && leaveRes.ok) {
        try {
          const leaveData = await leaveRes.json();
          if (leaveData.success && Array.isArray(leaveData.data)) {
            setRecentLeaves(leaveData.data);
            const pendingCount = leaveData.data.filter(l => l.status === 'Pending').length;
            setPendingLeavesCount(pendingCount);
            setTotalLeavesCount(leaveData.data.length);
          }
        } catch (e) {
          console.error('Error parsing leaves data:', e);
        }
      }

      console.log('📊 Employees Response:', empData);
      console.log('📊 Projects Response:', projData);

      if (empData.success) {
        const allEmps = empData.data || [];
        setAllEmployees(allEmps);
        
        // Filter employees based on role
        let filteredEmployees = allEmps;
        if (isEmployee && currentUser?.email) {
          // Employee sees all employees (not just their own record)
          filteredEmployees = allEmps; // Show all employees to logged-in employees
        }
        // Admin sees all employees (no filter)
        
        setRecentEmployees(filteredEmployees);
      }
      
      // Fetch attendance stats for all logged-in users
      if (isAdmin || isEmployee) {
        try {
          // Fetch both today-status and stats in parallel
          const [todayStatusRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/attendance/today-status`, { headers }),
            fetch(`${API_URL}/attendance/stats`, { headers })
          ]);
          
          const todayStatusData = await todayStatusRes.json();
          const statsData = await statsRes.json();
          
          console.log('📊 Stats API:', statsData);
          console.log('📊 Today Status API:', todayStatusData);
          
          let totalHours = 0;
          let activeCount = 0;
          let presentCount = 0;
          let absentCount = 0;
          
          // Get present/absent from stats API
          if (statsData.success) {
            presentCount = statsData.present || 0;
            absentCount = statsData.absent || 0;
          }
          
          // Also calculate from today-status data for accuracy
          if (todayStatusData.success && todayStatusData.data) {
            const calculatedPresent = todayStatusData.data.filter(emp => emp.attendanceToday).length;
            const calculatedAbsent = todayStatusData.data.filter(emp => !emp.attendanceToday).length;
            
            // Use calculated values if they differ (more accurate)
            if (calculatedAbsent > 0 || calculatedPresent > 0) {
              presentCount = calculatedPresent;
              absentCount = calculatedAbsent;
            }
            
            console.log('Calculated from today-status:', { presentCount, absentCount, calculatedPresent, calculatedAbsent });
            
            // Count active employees and work hours
            todayStatusData.data.forEach(emp => {
              if (emp.attendanceToday && emp.attendanceStatus === 'active') {
                if (emp.attendanceToday.workHours) {
                  totalHours += emp.attendanceToday.workHours;
                }
                if (emp.checkInTime && !emp.checkOutTime) {
                  const checkIn = new Date(emp.checkInTime);
                  const now = new Date();
                  const hours = (now - checkIn) / (1000 * 60 * 60);
                  totalHours += hours;
                }
                activeCount++;
              }
            });
          }
          
          setAttendanceStats({
            present: presentCount,
            absent: absentCount,
            activeNow: activeCount,
            totalWorkHours: totalHours.toFixed(1)
          });
          
          // Store attendance details for modal
          const details = todayStatusData.data?.map(emp => ({
            _id: emp._id,
            name: emp.name,
            email: emp.email,
            designation: emp.designation,
            status: emp.attendanceToday ? 'Present' : 'Absent',
            isActive: emp.attendanceStatus === 'active',
            checkInTime: emp.checkInTime,
            checkOutTime: emp.checkOutTime,
            workHours: emp.attendanceToday?.workHours || 0
          })) || [];
          setAttendanceDetails(details);
        } catch (err) {
          console.error('Error fetching attendance stats:', err);
        }
      }
      
      if (isAdmin) {
        try {
          const taskRes = await fetch(`${API_URL}/tasks/stats`, { headers });
          const taskData = await taskRes.json();
          if (taskData.success) {
            setTaskStats(taskData.data);
          }
        } catch (e) {
          console.error('Error fetching task stats:', e);
        }
        
        // Fetch leaves data for admin
        try {
          const leavesRes = await fetch(`${API_URL}/attendance/leave/all`, { headers });
          const leavesData = await leavesRes.json();
          if (leavesData.success) {
            setTotalLeavesCount(leavesData.stats?.total || 0);
            setPendingLeavesCount(leavesData.stats?.pending || 0);
          }
        } catch (e) {
          console.error('Error fetching leaves:', e);
        }
      }
      
      if (projData.success) {
        const allProjects = projData.data || [];
        
        // Filter projects based on role
        let filteredProjects = allProjects;
        if (isEmployee && currentUser?.email) {
          // Employee sees projects they are part of
          filteredProjects = allProjects.filter(proj => 
            proj.team?.some(member => 
              member?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
              member?.toLowerCase().includes(currentUser.email?.split('@')[0]?.toLowerCase())
            )
          );
        }
        // Admin sees all projects
        
        setProjects(filteredProjects);
        
        // Calculate stats based on filtered data
        const activeEmps = (empData.data || []).filter(e => e.status === 'Active');
        setStats({
          totalEmployees: (empData.data || []).length,  // Show all employees, not just 1
          activeEmployees: activeEmps.length,
          interns: (empData.data || []).filter(e => e.role === 'Interns').length,
          managers: (empData.data || []).filter(e => e.role === 'Manager').length,
          totalProjects: filteredProjects.length,
          activeProjects: filteredProjects.filter(p => p.status === 'In Progress').length,
          completedProjects: filteredProjects.filter(p => p.status === 'Completed').length
        });
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setApiError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Employee ID', 'Name', 'Designation', 'Email', 'User Role', 'Reporting To', 'Status'].join(','),
      ...recentEmployees.map(emp => [emp.id, emp.name, emp.designation, emp.email, emp.role, emp.reportingTo, emp.status].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddEmployee = async () => {
    if (!isAdmin) {
      alert('Access denied. Only admin can add employees.');
      return;
    }
    try {
      // Get token from localStorage
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alert('No token found. Please login again.');
        return;
      }

      console.log('🔑 Token for add employee:', token.substring(0, 30) + '...');

      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmployee)
      });
      const data = await response.json();
      console.log('📥 Add employee response:', data);

      if (data.success) {
        alert('Employee added successfully!');
        setShowAddModal(false);
        setNewEmployee({ name: '', email: '', designation: '', role: '', reportingTo: '', employeeId: '' });
        fetchDashboardData();
      } else {
        alert(data.message || 'Failed to add employee');
      }
    } catch (err) {
      console.error('❌ Add employee error:', err);
      alert('Failed to add employee: ' + err.message);
    }
  };

  const StatCard = ({ title, value, icon, bg, border, titleColor, iconBg, iconColor, linkTo, onClick }) => {
    const navigate = useNavigate();

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (linkTo) {
        navigate(linkTo.replace('#', ''));
      }
    };

    return (
      <div 
        className={`stat-card ${linkTo || onClick ? 'stat-card-clickable' : ''}`}
        style={!isDarkMode ? { 
          background: bg || 'var(--card-bg, #FFFFFF)', 
          borderColor: border || 'var(--border-color, #E5E7EB)' 
        } : {}}
        onClick={handleClick}
      >
        <div className="stat-card-top">
          <div 
            className="stat-icon" 
            style={{ 
              background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : (iconBg || '#E0E7FF'), 
              color: isDarkMode ? (iconColor || '#818CF8') : (iconColor || '#4F46E5'),
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
            }}
          >
            {icon}
          </div>
          <div className="stat-text-group">
            <p className="stat-title" style={{ color: !isDarkMode ? (titleColor || '#4B5563') : '#94A3B8' }}>{title}</p>
            <h3 className="stat-value" style={{ color: !isDarkMode ? (titleColor || '#111827') : '#F8FAFC' }}>{loading ? '...' : value}</h3>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard-home ${isDarkMode ? 'dark' : ''}`}>
      {/* Welcome Section */}
      <div className="dashboard-welcome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="dashboard-title">
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
              const name = currentUser?.name || '';
              const email = currentUser?.email || '';
              
              let nameText = '';
              if (name && !name.match(/^(admin|employee)$/i)) {
                const cleaned = name.replace(/\s+(admin|employee)$/i, '').trim();
                if (cleaned) {
                  nameText = cleaned;
                }
              }
              if (!nameText && email && email.includes('@')) {
                const prefix = email.split('@')[0].replace(/[0-9._-]+/g, '');
                if (prefix.length >= 2) {
                  nameText = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
                }
              }
              if (!nameText) {
                nameText = isAdmin ? 'Admin' : 'Employee';
              }

              const roleRaw = currentUser?.role || userRole || (isAdmin ? 'admin' : 'employee');
              const displayRole = roleRaw.toLowerCase() === 'admin' ? 'Admin' : 'Employee';
              
              return `${greeting}, ${nameText} (${displayRole})!`;
            })()}
          </h1>
          <p className="dashboard-subtitle">Here's what's happening in your organization today.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {apiError && (
            <div style={{ 
              background: '#FEE2E2', 
              color: '#DC2626', 
              padding: '8px 12px', 
              borderRadius: '6px',
              fontSize: '13px',
              maxWidth: '300px'
            }}>
              ⚠️ {apiError}
            </div>
          )}

          {/* Clock In / Clock Out Quick Action Button in Header (Employee Only) */}
          {!isAdmin && (!myTodayAttendance || !myTodayAttendance.checkInTime) && (
            <button
              onClick={handleClockIn}
              disabled={clockLoading}
              className="btn-clockin"
              title="Clock In for Today"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {clockLoading ? 'Clocking In...' : 'Clock In'}
            </button>
          )}

          {!isAdmin && myTodayAttendance && myTodayAttendance.checkInTime && !myTodayAttendance.checkOutTime && (
            <button
              onClick={handleClockOut}
              disabled={clockLoading}
              className="btn-clockout"
              title="Clock Out & See Work Hours"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
              </svg>
              {clockLoading ? 'Clocking Out...' : `Clock Out (${elapsedTime || 'Active'})`}
            </button>
          )}

          <button onClick={handleExport} className="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Data
          </button>
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Attendance & Clock Card (Employee Only) */}
      {!isAdmin && (
        <div className="clock-card">
          <div className="clock-card-info">
            <h3 className="clock-card-title">
              Attendance & Work Clock
              {myTodayAttendance?.checkInTime && !myTodayAttendance?.checkOutTime && (
                <span className="clock-card-badge">
                  Active ({elapsedTime})
                </span>
              )}
              {myTodayAttendance?.checkOutTime && (
                <span className="clock-card-badge">
                  ✓ Shift Completed
                </span>
              )}
              {(!myTodayAttendance || !myTodayAttendance?.checkInTime) && (
                <span className="clock-card-badge">
                  Not Clocked In
                </span>
              )}
            </h3>
            <p className="clock-card-subtitle">
              {!myTodayAttendance || !myTodayAttendance?.checkInTime
                ? 'Mark your attendance to start tracking your work hours.'
                : myTodayAttendance?.checkOutTime
                ? `Shift Duration: ${
                    Math.floor(myTodayAttendance.workHours || 0)
                  }h ${Math.round(((myTodayAttendance.workHours || 0) % 1) * 60)}m (Check In: ${new Date(myTodayAttendance.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Check Out: ${new Date(myTodayAttendance.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`
                : `Checked in at ${new Date(myTodayAttendance.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}. Click Clock Out when you finish.`}
            </p>
          </div>
          <div className="clock-card-actions">
            {(!myTodayAttendance || !myTodayAttendance?.checkInTime) && (
              <button
                onClick={handleClockIn}
                disabled={clockLoading}
                className="btn-clockin"
              >
                {clockLoading ? 'Clocking In...' : 'Clock In'}
              </button>
            )}

            {myTodayAttendance?.checkInTime && !myTodayAttendance?.checkOutTime && (
              <button
                onClick={handleClockOut}
                disabled={clockLoading}
                className="btn-clockout"
              >
                {clockLoading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            )}

            {myTodayAttendance?.checkOutTime && (
              <button
                onClick={() => {
                  const checkInDate = new Date(myTodayAttendance.checkInTime);
                  const checkOutDate = new Date(myTodayAttendance.checkOutTime);
                  const diffMs = Math.max(0, checkOutDate - checkInDate);
                  const totalMinutes = Math.floor(diffMs / (1000 * 60));
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  const formattedWorkTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;
                  setWorkSummaryModal({
                    show: true,
                    hours,
                    minutes,
                    totalHoursFormatted: formattedWorkTime,
                    checkInStr: checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                    checkOutStr: checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                  });
                }}
                className="btn-secondary"
              >
                View Shift Summary
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          bg="#F3E8FF"
          border="#E9D5FF"
          titleColor="#7E22CE"
          iconBg="#E9D5FF"
          iconColor="#7E22CE"
          linkTo="/employees"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          }
        />
        <StatCard
          title="Active Employees"
          value={attendanceStats.activeNow}
          bg="#EFF6FF"
          border="#BFDBFE"
          titleColor="#1D4ED8"
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          linkTo="/workhours"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        />
        <StatCard
          title="Interns"
          value={stats.interns}
          bg="#F0FDF4"
          border="#BBF7D0"
          titleColor="#15803D"
          iconBg="#DCFCE7"
          iconColor="#15803D"
          linkTo="/employees"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          }
        />
        <StatCard
          title="Managers"
          value={stats.managers}
          bg="#FFF7ED"
          border="#FED7AA"
          titleColor="#C2410C"
          iconBg="#FFEDD5"
          iconColor="#C2410C"
          linkTo="/employees"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        />
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          bg="#FDF2F8"
          border="#FBCFE8"
          titleColor="#BE185D"
          iconBg="#FCE7F3"
          iconColor="#BE185D"
          linkTo="/projects"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          }
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          bg="#ECFEFF"
          border="#A5F3FC"
          titleColor="#0E7490"
          iconBg="#CFFAFE"
          iconColor="#0E7490"
          linkTo="/projects"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          }
        />
        <StatCard
          title="Completed Projects"
          value={stats.completedProjects}
          bg="#F0FDF4"
          border="#BBF7D0"
          titleColor="#15803D"
          iconBg="#DCFCE7"
          iconColor="#15803D"
          linkTo="/projects"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          }
        />
        {isAdmin && (
          <StatCard
            title="Present Today"
            value={attendanceStats.present}
            bg="#F0F9FF"
            border="#BAE6FD"
            titleColor="#0369A1"
            iconBg="#E0F2FE"
            iconColor="#0369A1"
            onClick={() => {
              setAttendanceModalTitle('Present Today');
              setAttendanceModalFilter('present');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            }
          />
        )}
        <StatCard
          title="Active Now"
          value={attendanceStats.activeNow}
          bg="#ECFEFF"
          border="#A5F3FC"
          titleColor="#0E7490"
          iconBg="#CFFAFE"
          iconColor="#0E7490"
          onClick={() => {
            setAttendanceModalTitle('Active Now');
            setAttendanceModalFilter('active');
            setShowAttendanceModal(true);
          }}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          }
        />
        {isAdmin && (
          <StatCard
            title="Total Work Hours"
            value={`${attendanceStats.totalWorkHours}H`}
            bg="#F3E8FF"
            border="#E9D5FF"
            titleColor="#6B21A8"
            iconBg="#E9D5FF"
            iconColor="#6B21A8"
            onClick={() => {
              setAttendanceModalTitle('All Attendance Today');
              setAttendanceModalFilter('all');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Absent Today"
            value={attendanceStats.absent}
            bg="#FEF2F2"
            border="#FECACA"
            titleColor="#B91C1C"
            iconBg="#FEE2E2"
            iconColor="#B91C1C"
            onClick={() => {
              setAttendanceModalTitle('Absent Today');
              setAttendanceModalFilter('absent');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="18" y1="8" x2="23" y2="13"></line>
                <line x1="23" y1="8" x2="18" y2="13"></line>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Total Tasks"
            value={taskStats.total}
            bg="#F5F3FF"
            border="#DDD6FE"
            titleColor="#6D28D9"
            iconBg="#EDE9FE"
            iconColor="#6D28D9"
            onClick={() => setShowTaskManager(true)}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Total Leaves"
            value={totalLeavesCount}
            bg="#ECFDF5"
            border="#A7F3D0"
            titleColor="#047857"
            iconBg="#D1FAE5"
            iconColor="#047857"
            onClick={() => setShowLeavePopup(true)}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            }
          />
        )}
      </div>

      <div className="dashboard-top-grid">
        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="quick-actions-title">Quick Actions</h2>
          <div className="quick-actions-buttons">
            {isAdmin && (
              <button onClick={() => setShowTaskManager(true)} className="btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                Manage Tasks
              </button>
            )}
            {isEmployee && (
              <button onClick={() => setShowMyTasks(true)} className="btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                My Tasks
              </button>
            )}
            <Link to="/employees" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              View All Employees
            </Link>
            <button 
              onClick={() => isAdmin ? setShowAddModal(true) : alert('Access denied. Only admin can add employees.')}
              className="btn-secondary"
              style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Add Employee
            </button>
            <button onClick={handleExport} className="btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export Data
            </button>
          </div>
        </div>

        {/* Today's Overview (Donut Chart Box) */}
        <div className="section-box todays-overview-card">
          <div className="section-box-header">
            <h2 className="section-box-title">Today's Overview</h2>
            <Link to="/analytics" className="view-all-link">View Report ›</Link>
          </div>
          <div className="overview-card-body">
            <div className="donut-wrapper">
              <div className="conic-donut">
                <div className="donut-center">
                  <span className="donut-value">{stats.totalEmployees || 21}</span>
                  <span className="donut-sub">Employees</span>
                </div>
              </div>
            </div>
            <div className="overview-legend-list">
              <div className="legend-row">
                <span className="dot dot-present"></span>
                <span className="legend-name">Present</span>
                <span className="legend-val">{attendanceStats.present} (0%)</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-absent"></span>
                <span className="legend-name">Absent</span>
                <span className="legend-val">{attendanceStats.absent} (28.6%)</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-leave"></span>
                <span className="legend-name">On Leave</span>
                <span className="legend-val">{totalLeavesCount || 9} (42.9%)</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-others"></span>
                <span className="legend-name">Others</span>
                <span className="legend-val">6 (28.6%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="three-boxes-grid">
        <div className="section-box">
          <div className="section-box-header">
            <h2 className="section-box-title">Recent Employees</h2>
            <Link to="/employees" className="view-all-link">View All →</Link>
          </div>
          <div className="section-box-body">
            {loading ? (
              <p className="loading-text">Loading...</p>
            ) : recentEmployees.length === 0 ? (
              <p className="empty-text">No employees found.</p>
            ) : (
              <div className="employee-list">
                {recentEmployees.slice(0, 5).map((emp) => (
                  <div key={emp._id} className="employee-item">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=4F46E5&color=fff&size=40`}
                      alt={emp.name}
                      className="employee-avatar"
                    />
                    <div className="employee-info">
                      <p className="employee-name">{emp.name}</p>
                      <p className="employee-designation">{emp.designation || 'Employee'}</p>
                    </div>
                    <span className={`employee-status ${attendanceStatus[emp._id] === 'Present' ? 'status-active' : 'status-inactive'}`}>
                      {attendanceStatus[emp._id] === 'Present' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="section-box-footer">
            <Link to="/employees" className="footer-link-btn">View All Employees</Link>
          </div>
        </div>

        <div className="section-box">
          <div className="section-box-header">
            <h2 className="section-box-title">Recent Projects</h2>
            <Link to="/projects" className="view-all-link">View All →</Link>
          </div>
          <div className="section-box-body">
            {loading ? (
              <p className="loading-text">Loading...</p>
            ) : projects.length === 0 ? (
              <p className="empty-text">No projects found.</p>
            ) : (
              <div className="employee-list">
                {projects.slice(0, 5).map((proj) => {
                  const statusClass = proj.status === 'Completed' ? 'completed' : proj.status === 'On Hold' ? 'onhold' : proj.status === 'Planning' ? 'planning' : 'inprogress';
                  const themeColor = proj.status === 'Completed' ? '#0891B2' : proj.status === 'On Hold' ? '#7E22CE' : proj.status === 'Planning' ? '#D97706' : '#2563EB';
                  const themeBg = proj.status === 'Completed' ? '#ECFEFF' : proj.status === 'On Hold' ? '#F3E8FF' : proj.status === 'Planning' ? '#FEF3C7' : '#EFF6FF';
                  return (
                    <div key={proj._id || proj.name} className="project-item-row">
                      <div className="project-icon-badge" style={{ background: themeBg, color: themeColor }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <div className="project-info-group">
                        <div className="project-name-row">
                          <p className="project-name">{proj.name}</p>
                          <span className="project-pct-label">{proj.progress || 0}%</span>
                        </div>
                        <p className="project-desc">{proj.description || 'Project details'}</p>
                        <div className="project-progress-track">
                          <div className="project-progress-fill" style={{ width: `${proj.progress || 0}%`, background: themeColor }}></div>
                        </div>
                      </div>
                      <span className={`employee-status status-${statusClass}`}>
                        {proj.status || 'Active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="section-box-footer">
            <Link to="/projects" className="footer-link-btn">View All Projects</Link>
          </div>
        </div>

        <div className="section-box">
          <div className="section-box-header">
            <h2 className="section-box-title">Leave Requests</h2>
            <Link to="/attendance" className="view-all-link">View All →</Link>
          </div>
          <div className="section-box-body">
            <div className="employee-list">
              {recentLeaves.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                  No leave requests found.
                </div>
              ) : (
                recentLeaves.slice(0, 5).map((leave, idx) => {
                  const title = leave.reason || leave.title || (leave.employeeId?.name ? `${leave.employeeId.name}'s Leave` : `${leave.leaveType || 'Leave'} Request`);
                  const startDateStr = leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                  const endDateStr = leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                  const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
                  const typeText = `${leave.leaveType || 'Casual Leave'} • ${dateRange}`;
                  const status = leave.status || 'Pending';
                  
                  const statusColors = {
                    Pending: { bg: '#FEF3C7', color: '#D97706' },
                    Approved: { bg: '#E6F4EA', color: '#137333' },
                    Rejected: { bg: '#FEE2E2', color: '#DC2626' },
                    Cancelled: { bg: '#F3F4F6', color: '#6B7280' }
                  };
                  const theme = statusColors[status] || statusColors.Pending;

                  return (
                    <div key={leave._id || leave.id || idx} className="employee-item leave-item-row">
                      <div className="leave-icon-badge" style={{ background: theme.bg, color: theme.color }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <div className="employee-info">
                        <p className="employee-name">{title}</p>
                        <p className="employee-designation">{typeText}</p>
                      </div>
                      <span className={`employee-status status-${status.toLowerCase()}`}>
                        {status}
                      </span>
                      <span className="arrow-chevron">›</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="section-box-footer">
            <Link to="/attendance" className="footer-link-btn">View All Leave Requests</Link>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} className="modal-close-btn">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddEmployee(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    value={newEmployee.name} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} 
                    required 
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input 
                    type="email" 
                    value={newEmployee.email} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} 
                    required 
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <select 
                    value={newEmployee.designation} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })} 
                    required 
                    className="form-select"
                  >
                    <option value="">Select</option>
                    <option value="Intern">Intern</option>
                    <option value="Software Development">Software Development</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select 
                    value={newEmployee.role} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} 
                    required 
                    className="form-select"
                  >
                    <option value="">Select</option>
                    <option value="Employee">Employee</option>
                    <option value="Interns">Interns</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Reporting To *</label>
                  <input 
                    type="text" 
                    value={newEmployee.reportingTo} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, reportingTo: e.target.value })} 
                    required 
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID (Optional)</label>
                  <input 
                    type="text" 
                    value={newEmployee.employeeId} 
                    onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })} 
                    placeholder="Auto-generated" 
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-info">
                💾 Will be saved to MongoDB Atlas
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-save">Save to Atlas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskManager && (
        <TaskManager
          employees={allEmployees}
          onClose={() => setShowTaskManager(false)}
          onTaskCreated={() => {
            // Refresh task stats
            fetchDashboardData();
          }}
        />
      )}

      {showMyTasks && (
        <div className="modal-overlay" onClick={() => setShowMyTasks(false)}>
          <div className="modal-container my-tasks-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">My Tasks</h2>
              <button onClick={() => setShowMyTasks(false)} className="modal-close-btn">×</button>
            </div>
            <MyTasks />
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal-container attendance-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">{attendanceModalTitle} ({attendanceDetails.filter(emp => {
                if (attendanceModalFilter === 'present') return emp.status === 'Present';
                if (attendanceModalFilter === 'absent') return emp.status === 'Absent';
                if (attendanceModalFilter === 'active') return emp.isActive;
                return true;
              }).length})</h2>
              <button onClick={() => setShowAttendanceModal(false)} className="modal-close-btn">×</button>
            </div>
            <div className="attendance-list" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
              {(() => {
                const filteredEmployees = attendanceDetails.filter(emp => {
                  if (attendanceModalFilter === 'present') return emp.status === 'Present';
                  if (attendanceModalFilter === 'absent') return emp.status === 'Absent';
                  if (attendanceModalFilter === 'active') return emp.isActive;
                  return true;
                });
                console.log('Modal Filter:', attendanceModalFilter, 'Total:', attendanceDetails.length, 'Filtered:', filteredEmployees.length);
                console.log('All employees:', attendanceDetails.map(e => ({ name: e.name, status: e.status, isActive: e.isActive })));
                
                if (filteredEmployees.length === 0) {
                  return <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px' }}>No employees found</p>;
                }
                
                return filteredEmployees.map((emp) => (
                  <div key={emp._id} className="employee-item" style={{ 
                    padding: '15px', 
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=4F46E5&color=fff&size=45`}
                      alt={emp.name}
                      className="employee-avatar"
                      style={{ width: '45px', height: '45px', borderRadius: '50%' }}
                    />
                    <div className="employee-info" style={{ flex: 1 }}>
                      <p className="employee-name" style={{ fontWeight: '600', margin: '0 0 4px 0' }}>{emp.name}</p>
                      <p className="employee-designation" style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{emp.designation || emp.email}</p>
                      {emp.checkInTime && (
                        <p style={{ fontSize: '12px', color: '#059669', margin: '4px 0 0 0' }}>
                          Check-in: {new Date(emp.checkInTime).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span 
                        className={`employee-status ${emp.status === 'Present' ? 'status-active' : 'status-inactive'}`}
                        style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px',
                          fontWeight: '500',
                          background: emp.status === 'Present' ? '#D1FAE5' : '#FEE2E2',
                          color: emp.status === 'Present' ? '#059669' : '#DC2626'
                        }}
                      >
                        {emp.status}
                      </span>
                      {emp.isActive && (
                        <p style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>● Active Now</p>
                      )}
                      {emp.workHours > 0 && (
                        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{emp.workHours}h worked</p>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {showLeavePopup && isAdmin && (
        <AdminLeavePopup onClose={() => setShowLeavePopup(false)} />
      )}

      {/* Work Hours Summary Modal when Clock Out is pressed */}
      {workSummaryModal.show && (
        <div 
          className="summary-modal-overlay"
          onClick={() => setWorkSummaryModal({ show: false, hours: 0, minutes: 0, totalHoursFormatted: '', checkInStr: '', checkOutStr: '' })}
        >
          <div className="summary-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="summary-modal-title">Shift Completed</h2>
            <p className="summary-modal-subtitle">Your work hours for today have been recorded.</p>
            
            <div className="summary-time-display">
              <div className="summary-time-lbl">Total Time Worked</div>
              <div className="summary-time-val">{workSummaryModal.totalHoursFormatted}</div>
              
              <div className="summary-time-grid">
                <div className="summary-grid-box">
                  <div className="summary-grid-lbl">Check In</div>
                  <div className="summary-grid-val">{workSummaryModal.checkInStr}</div>
                </div>
                <div className="summary-grid-box">
                  <div className="summary-grid-lbl">Check Out</div>
                  <div className="summary-grid-val">{workSummaryModal.checkOutStr}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setWorkSummaryModal({ show: false, hours: 0, minutes: 0, totalHoursFormatted: '', checkInStr: '', checkOutStr: '' })}
              className="btn-primary"
              style={{ width: '100%', height: '42px', fontSize: '14px', fontWeight: '600' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
