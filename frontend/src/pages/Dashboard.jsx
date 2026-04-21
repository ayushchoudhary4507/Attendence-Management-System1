import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceButton from '../components/AttendanceButton';
import TaskManager from '../components/TaskManager';
import MyTasks from '../components/MyTasks';
import AdminLeavePopup from '../components/AdminLeavePopup';
import '../components/AttendanceButton.css';
import '../components/TaskManager.css';
import '../components/MyTasks.css';
import './Dashboard.css';

const API_URL = 'https://attendence-management-system1.onrender.com/api';

const Dashboard = ({ onLogout, userRole }) => {
  const navigate = useNavigate();
  const isAdmin = userRole === 'admin';
  const isEmployee = userRole === 'employee';
  
  // Get current logged in user info
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    designation: '',
    role: '',
    reportingTo: '',
    employeeId: ''
  });

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

  useEffect(() => {
    fetchDashboardData();
    // Apply initial theme
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(isDarkMode ? 'dark-theme' : 'light-theme');
    
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

      const [empRes, projRes] = await Promise.all([
        fetch(`${API_URL}/employees`, { headers }),
        fetch(`${API_URL}/projects`, { headers })
      ]);

      // Check if responses are ok
      if (!empRes.ok) {
        throw new Error(`Employees API error: ${empRes.status} ${empRes.statusText}`);
      }
      if (!projRes.ok) {
        throw new Error(`Projects API error: ${projRes.status} ${projRes.statusText}`);
      }

      const empData = await empRes.json();
      const projData = await projRes.json();

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
      
      // Fetch notifications for admin
      if (isAdmin) {
        try {
          const notifRes = await fetch(`${API_URL}/notifications`, { headers });
          const notifData = await notifRes.json();
          if (notifData.success) {
            setNotifications(notifData.data || []);
            setUnreadCount(notifData.unreadCount || 0);
          }
        } catch (e) {
          console.error('Error fetching notifications:', e);
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

  const StatCard = ({ title, value, icon, color, linkTo, onClick }) => {
    const navigate = useNavigate();

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (linkTo) {
        navigate(linkTo.replace('#', ''));
      }
    };

    const cardContent = (
      <>
        <div className="stat-icon" style={{ background: color }}>
          {icon}
        </div>
        <div>
          <p className="stat-title">{title}</p>
          <h3 className="stat-value">{loading ? '...' : value}</h3>
        </div>
      </>
    );

    const cardClass = `stat-card ${linkTo || onClick ? 'stat-card-clickable' : ''}`;

    if (onClick || linkTo) {
      return (
        <div className={cardClass} onClick={handleClick}>
          {cardContent}
        </div>
      );
    }

    return <div className="stat-card">{cardContent}</div>;
  };

  return (
    <div className={`dashboard-home ${isDarkMode ? 'dark' : ''}`}>
      {/* Welcome Section */}
      <div className="dashboard-welcome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back! Here's your HR overview.</p>
          
          {lastRefreshed && (
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Last updated: {lastRefreshed}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#9CA3AF' : '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          color="#4F46E5"
          linkTo="#/employees"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          color="#10B981"
          linkTo="#/workhours"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          }
        />
        <StatCard
          title="Interns"
          value={stats.interns}
          color="#F59E0B"
          linkTo="#/employees"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          }
        />
        <StatCard
          title="Managers"
          value={stats.managers}
          color="#EF4444"
          linkTo="#/employees"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        />
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          color="#8B5CF6"
          linkTo="#/projects"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          }
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          color="#06B6D4"
          linkTo="#/projects"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          }
        />
        <StatCard
          title="Completed Projects"
          value={stats.completedProjects}
          color="#10B981"
          linkTo="#/projects"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          }
        />
        {isAdmin && (
          <StatCard
            title="Present Today"
            value={attendanceStats.present}
            color="#10B981"
            onClick={() => {
              setAttendanceModalTitle('Present Today');
              setAttendanceModalFilter('present');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            }
          />
        )}
        <StatCard
          title="Active Now"
          value={attendanceStats.activeNow}
          color="#06B6D4"
          onClick={() => {
            setAttendanceModalTitle('Active Now');
            setAttendanceModalFilter('active');
            setShowAttendanceModal(true);
          }}
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          }
        />
        {isAdmin && (
          <StatCard
            title="Total Work Hours"
            value={`${attendanceStats.totalWorkHours}h`}
            color="#8B5CF6"
            onClick={() => {
              setAttendanceModalTitle('All Attendance Today');
              setAttendanceModalFilter('all');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Absent Today"
            value={attendanceStats.absent}
            color="#EF4444"
            onClick={() => {
              setAttendanceModalTitle('Absent Today');
              setAttendanceModalFilter('absent');
              setShowAttendanceModal(true);
            }}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Total Tasks"
            value={taskStats.total}
            color="#8B5CF6"
            onClick={() => setShowTaskManager(true)}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            color="#10B981"
            onClick={() => setShowLeavePopup(true)}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            }
          />
        )}
        {isAdmin && (
          <StatCard
            title="Pending Leaves"
            value={pendingLeavesCount}
            color="#F59E0B"
            onClick={() => setShowLeavePopup(true)}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            }
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2 className="quick-actions-title">Quick Actions</h2>
        <div className="quick-actions-buttons">
          {isEmployee && <AttendanceButton />}
          
          {isAdmin && (
            <button 
              onClick={() => setShowTaskManager(true)}
              className="btn-secondary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              Manage Tasks
            </button>
          )}
          
          {isEmployee && (
            <button 
              onClick={() => setShowMyTasks(true)}
              className="btn-secondary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              My Tasks
            </button>
          )}
          
          <a href="#/employees" className="btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            View All Employees
          </a>
          <button 
            onClick={() => isAdmin ? setShowAddModal(true) : alert('Access denied. Only admin can add employees.')}
            className="btn-secondary"
            style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            title={isAdmin ? 'Add Employee' : 'Admin access required'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Add Employee
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Data
          </button>
        </div>
      </div>

      {/* Notifications Section for Admin */}
      {isAdmin && notifications.length > 0 && (
        <div className={`notifications-section ${isDarkMode ? 'dark' : ''}`}>
          <div className="notifications-header">
            <h2>
              📬 Notifications 
              {unreadCount > 0 && (
                <span className="notifications-badge">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button 
              className="mark-all-read-btn"
              onClick={async () => {
                try {
                  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                  await fetch(`${API_URL}/notifications/mark-all-read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  setUnreadCount(0);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                } catch (e) {
                  console.error('Error marking all as read:', e);
                }
              }}
            >
              Mark all as read
            </button>
          </div>
          
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              >
                <div className="notification-content-wrapper">
                  <div>
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <p className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      className="mark-read-btn"
                      onClick={async () => {
                        try {
                          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                          await fetch(`${API_URL}/notifications/${notification._id}/read`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          setNotifications(prev => 
                            prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
                          );
                          setUnreadCount(prev => Math.max(0, prev - 1));
                        } catch (e) {
                          console.error('Error marking as read:', e);
                        }
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Employees */}
      <div className="recent-employees">
        <div className="recent-header">
          <h2 className="recent-title">Recent Employees</h2>
          <a href="#/employees" className="view-all-link">
            View All →
          </a>
        </div>
        
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : recentEmployees.length === 0 ? (
          <p className="empty-text">No employees found. Add your first employee!</p>
        ) : (
          <div className="employee-list">
            {recentEmployees.map((emp) => (
              <div key={emp._id} className="employee-item">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=4F46E5&color=fff&size=40`}
                  alt={emp.name}
                  className="employee-avatar"
                />
                <div className="employee-info">
                  <p className="employee-name">{emp.name}</p>
                  <p className="employee-designation">{emp.designation}</p>
                </div>
                <span className={`employee-status ${attendanceStatus[emp._id] === 'Present' ? 'status-active' : 'status-inactive'}`}>
                  {attendanceStatus[emp._id] === 'Present' ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Projects */}
      <div className="recent-employees" style={{ marginTop: '30px' }}>
        <div className="recent-header">
          <h2 className="recent-title">Recent Projects</h2>
          <a href="#/projects" className="view-all-link">
            View All →
          </a>
        </div>
        
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="empty-text">No projects found.</p>
        ) : (
          <div className="employee-list">
            {projects.slice(0, 5).map((proj) => (
              <div key={proj._id} className="employee-item">
                <div className="employee-info" style={{ flex: 1 }}>
                  <p className="employee-name">{proj.name}</p>
                  <p className="employee-designation">{proj.description?.substring(0, 50)}...</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`employee-status ${proj.status === 'Completed' ? 'status-active' : 'status-inactive'}`}>
                    {proj.status}
                  </span>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    {proj.progress}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
};

export default Dashboard;
