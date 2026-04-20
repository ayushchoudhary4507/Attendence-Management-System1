import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, attendanceAPI, taskAPI, projectsAPI } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import './Analytics.css';

const Analytics = ({ userRole }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAttendance: 0,
    totalLeaves: 0,
    activeProjects: 0,
    thisMonthGrowth: 0,
    avgWorkHours: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [attendanceTypes, setAttendanceTypes] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [projectStats, setProjectStats] = useState({ completed: 0, inProgress: 0, pending: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Colors for charts
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const DEPT_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    // Get current logged in user info
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is logged in
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        setError('Please login to view analytics');
        setLoading(false);
        return;
      }
      
      // Get user role from storage
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isAdmin = user?.role === 'admin';
      
      // Fetch data based on role
      let employeesRes, attendanceRes, projectsRes, leavesRes;
      
      if (isAdmin) {
        // Admin - fetch all data
        [employeesRes, attendanceRes, projectsRes, leavesRes] = await Promise.all([
          fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch('/api/attendance/today-status', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          projectsAPI.getAllProjects(),
          fetch('/api/attendance/leave/all', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]);
      } else {
        // Employee - fetch accessible data including their own employee info
        [employeesRes, attendanceRes, projectsRes, leavesRes] = await Promise.all([
          fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch('/api/attendance/today-status', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          projectsAPI.getAllProjects(),
          fetch('/api/attendance/leave/all', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]);
      }

      // Extract data from API responses
      const employees = employeesRes?.users || employeesRes?.data || [];
      const attendanceData = attendanceRes?.data || [];
      const projects = projectsRes?.data || [];

      // Calculate stats
      const totalEmployees = employees.length;
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'Active' || p.status === 'In Progress').length;
      
      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate leaves from leave data
      const leavesData = leavesRes?.data || [];
      const totalLeaves = leavesData.filter(leave => {
        const startDate = new Date(leave.startDate).toISOString().split('T')[0];
        const endDate = new Date(leave.endDate).toISOString().split('T')[0];
        return today >= startDate && today <= endDate && leave.status === 'Approved';
      }).length;
      
      // Calculate present from attendance data
      const totalPresent = attendanceData.filter(a => 
        a.attendanceToday || a.status === 'present' || a.type === 'present' || a.attendanceStatus === 'active'
      ).length;
      
      // Calculate this month growth
      const thisMonth = new Date().getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const thisMonthCount = employees.filter(e => {
        const joinDate = new Date(e.joinDate || e.createdAt);
        return joinDate.getMonth() === thisMonth;
      }).length;
      const lastMonthCount = employees.filter(e => {
        const joinDate = new Date(e.joinDate || e.createdAt);
        return joinDate.getMonth() === lastMonth;
      }).length;
      const thisMonthGrowth = lastMonthCount > 0 
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : thisMonthCount * 100;

      // Calculate average work hours
      const avgWorkHours = attendanceData.length > 0
        ? Math.round(attendanceData.reduce((sum, a) => sum + (a.hours || a.workHours || 8), 0) / attendanceData.length)
        : 0;

      setStats({
        totalEmployees,
        totalAttendance: totalPresent,
        totalLeaves,
        activeProjects,
        thisMonthGrowth: thisMonthGrowth > 0 ? `+${thisMonthGrowth}` : thisMonthGrowth,
        avgWorkHours
      });

      // Generate monthly data for bar chart
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const monthlyStats = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthAttendance = attendanceData.filter(a => {
          const date = new Date(a.date || a.createdAt);
          return date.getMonth() === monthIndex;
        });
        
        monthlyStats.push({
          name: months[monthIndex],
          present: monthAttendance.filter(a => a.status === 'present' || a.status === 'Present' || a.attendanceStatus === 'active').length,
          absent: monthAttendance.filter(a => a.status === 'absent' || a.status === 'Absent').length,
          leave: monthAttendance.filter(a => a.status === 'leave' || a.status === 'Leave' || a.status === 'Pending').length
        });
      }
      setMonthlyData(monthlyStats);

      // Generate attendance types data for pie chart
      const attendanceTypeData = [
        { name: 'Present', value: totalPresent, color: '#10b981' },
        { name: 'Absent', value: attendanceData.filter(a => a.status === 'absent' || a.status === 'Absent').length, color: '#ef4444' },
        { name: 'Leave', value: totalLeaves, color: '#f59e0b' },
        { name: 'Half Day', value: attendanceData.filter(a => a.status === 'half_day' || a.status === 'Half-Day').length, color: '#8b5cf6' }
      ].filter(item => item.value > 0);
      
      setAttendanceTypes(attendanceTypeData);

      // Generate department distribution data
      const departments = {};
      employees.forEach(e => {
        const dept = e.department || e.designation || 'Unassigned';
        departments[dept] = (departments[dept] || 0) + 1;
      });
      const deptData = Object.entries(departments).map(([name, value], index) => ({
        name,
        value,
        color: DEPT_COLORS[index % DEPT_COLORS.length]
      }));
      setDepartmentData(deptData);

      // Generate weekly trend data (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyToday = new Date();
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(weeklyToday);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        
        const dayAttendance = attendanceData.filter(a => {
          const aDate = new Date(a.date || a.createdAt);
          return aDate.toDateString() === date.toDateString();
        });
        
        weeklyData.push({
          day: dayName,
          present: dayAttendance.filter(a => a.status === 'present' || a.attendanceStatus === 'active').length,
          absent: dayAttendance.filter(a => a.status === 'absent').length,
          leave: dayAttendance.filter(a => a.status === 'leave' || a.status === 'Leave').length
        });
      }
      setWeeklyTrend(weeklyData);

      // Calculate project statistics
      const completed = projects.filter(p => p.status === 'completed' || p.status === 'Completed').length;
      const inProgress = projects.filter(p => p.status === 'active' || p.status === 'Active' || p.status === 'In Progress').length;
      const pending = projects.filter(p => p.status === 'pending' || p.status === 'Pending' || p.status === 'Planning').length;
      setProjectStats({ completed, inProgress, pending });

      // Recent activity
      const recent = attendanceData
        .slice(-5)
        .reverse()
        .map(a => ({
          id: a._id,
          name: a.employeeName || a.employeeId?.name || a.name || 'Employee',
          action: a.status === 'present' || a.status === 'Present' ? 'checked in' : a.status === 'leave' || a.status === 'Leave' ? 'on leave' : a.attendanceStatus === 'active' ? 'checked in' : 'checked out',
          time: new Date(a.date || a.createdAt || a.checkInTime).toLocaleDateString()
        }));
      setRecentActivity(recent);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const StatCard = ({ title, value, subtitle, trend, linkTo, onClick }) => {
    const handleClick = () => {
      if (onClick) onClick();
      else if (linkTo) navigate(linkTo);
    };

    const isClickable = linkTo || onClick;

    return (
      <div 
        className={`stat-card ${isClickable ? 'stat-card-clickable' : ''}`} 
        onClick={handleClick}
        style={isClickable ? { cursor: 'pointer' } : {}}
      >
        <div className="stat-content">
          <div className="stat-info">
            <h3 className="stat-title">{title}</h3>
            <p className="stat-value">{value}</p>
            {trend && <p className="stat-trend">{trend}</p>}
            {subtitle && <p className="stat-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  const icons = {
    employees: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
    attendance: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    ),
    leaves: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
      </svg>
    ),
    projects: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    growth: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    ),
    hours: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>
    )
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <div className="error-icon">⚠️</div>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.hash = '/login'}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="header-left">
          <h1>Analytics & Reports</h1>
          <p className="analytics-subtitle">Platform performance and insights</p>
        </div>
        <div className="header-right">
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">LIVE</span>
          </div>
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          trend={stats.thisMonthGrowth}
          linkTo="/employees"
        />
        <StatCard
          title="Present Today"
          value={stats.totalAttendance}
          trend="Active now"
          linkTo="/attendance"
        />
        <StatCard
          title="On Leave"
          value={stats.totalLeaves}
          subtitle="This month"
          linkTo="/attendance"
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle="In progress"
          linkTo="/projects"
        />
        <StatCard
          title="Monthly Growth"
          value={stats.thisMonthGrowth}
          trend="vs last month"
        />
        <StatCard
          title="Avg Work Hours"
          value={stats.avgWorkHours}
          subtitle="Per day"
          linkTo="/workhours"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>Monthly Attendance Overview</h3>
          <div className="chart-container">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leave" name="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-loading">No data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>Attendance Distribution</h3>
          <div className="chart-container">
            {attendanceTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attendanceTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-loading">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* New Analytics Section - Weekly & Department */}
      <div className="charts-section">
        {/* Weekly Attendance Trend */}
        <div className="chart-card wide">
          <h3>Weekly Attendance Trend</h3>
          <div className="chart-container">
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="leave" name="Leave" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-loading">No data available</div>
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="chart-card">
          <h3>Department Distribution</h3>
          <div className="chart-container">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-loading">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Project Progress Section */}
      <div className="analytics-section">
        <h3>Project Status Overview</h3>
        <div className="progress-cards">
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">Completed</span>
              <span className="progress-value">{projectStats.completed}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill completed" 
                style={{ width: `${projectStats.completed + projectStats.inProgress + projectStats.pending > 0 ? (projectStats.completed / (projectStats.completed + projectStats.inProgress + projectStats.pending) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">In Progress</span>
              <span className="progress-value">{projectStats.inProgress}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill in-progress" 
                style={{ width: `${projectStats.completed + projectStats.inProgress + projectStats.pending > 0 ? (projectStats.inProgress / (projectStats.completed + projectStats.inProgress + projectStats.pending) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">Pending</span>
              <span className="progress-value">{projectStats.pending}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill pending" 
                style={{ width: `${projectStats.completed + projectStats.inProgress + projectStats.pending > 0 ? (projectStats.pending / (projectStats.completed + projectStats.inProgress + projectStats.pending) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-card">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-avatar">
                  {activity.name.charAt(0).toUpperCase()}
                </div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{activity.name}</strong> {activity.action}
                  </p>
                  <p className="activity-time">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="no-activity">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
