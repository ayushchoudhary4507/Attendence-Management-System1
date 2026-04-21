const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Project = require('../models/Project');
const { authMiddleware: auth } = require('../middleware/authMiddleware');

// Get analytics dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get all employees
    const employees = await Employee.find({});
    
    // Get attendance data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceQuery = userRole === 'admin' 
      ? { date: { $gte: thirtyDaysAgo } }
      : { employee: userId, date: { $gte: thirtyDaysAgo } };
    
    const attendance = await Attendance.find(attendanceQuery)
      .populate('employee', 'name email');
    
    // Get projects
    const projects = await Project.find({});
    
    // Calculate stats
    const totalEmployees = employees.length;
    const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'active').length;
    
    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = attendance.filter(a => {
      const attDate = new Date(a.date);
      attDate.setHours(0, 0, 0, 0);
      return attDate.getTime() === today.getTime();
    });
    
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
    const onLeaveToday = todayAttendance.filter(a => a.status === 'leave').length;
    
    // Monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyAttendance = attendance.filter(a => {
      const attDate = new Date(a.date);
      return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear;
    });
    
    const totalLeaves = monthlyAttendance.filter(a => a.status === 'leave').length;
    const avgWorkHours = monthlyAttendance.length > 0 
      ? Math.round(monthlyAttendance.reduce((sum, a) => sum + (a.workHours || 8), 0) / monthlyAttendance.length)
      : 0;
    
    // Calculate growth
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const thisMonthEmployees = employees.filter(e => {
      const joinDate = new Date(e.createdAt);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    
    const lastMonthEmployees = employees.filter(e => {
      const joinDate = new Date(e.createdAt);
      return joinDate.getMonth() === lastMonth && joinDate.getFullYear() === lastMonthYear;
    }).length;
    
    const growth = lastMonthEmployees > 0
      ? Math.round(((thisMonthEmployees - lastMonthEmployees) / lastMonthEmployees) * 100)
      : thisMonthEmployees * 100;
    
    // Generate monthly chart data (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      let monthIndex = currentMonth - i;
      let year = currentYear;
      if (monthIndex < 0) {
        monthIndex += 12;
        year -= 1;
      }
      
      const monthAttendance = attendance.filter(a => {
        const attDate = new Date(a.date);
        return attDate.getMonth() === monthIndex && attDate.getFullYear() === year;
      });
      
      monthlyData.push({
        name: months[monthIndex],
        present: monthAttendance.filter(a => a.status === 'present').length,
        absent: monthAttendance.filter(a => a.status === 'absent').length,
        leave: monthAttendance.filter(a => a.status === 'leave').length,
        halfDay: monthAttendance.filter(a => a.status === 'half-day').length
      });
    }
    
    // Attendance distribution for pie chart
    const attendanceTypes = [
      { name: 'Present', value: monthlyAttendance.filter(a => a.status === 'present').length, color: '#10b981' },
      { name: 'Absent', value: monthlyAttendance.filter(a => a.status === 'absent').length, color: '#ef4444' },
      { name: 'Leave', value: monthlyAttendance.filter(a => a.status === 'leave').length, color: '#f59e0b' },
      { name: 'Half Day', value: monthlyAttendance.filter(a => a.status === 'half-day').length, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
    
    // Recent activity
    const recentActivity = attendance
      .slice(-10)
      .reverse()
      .map(a => ({
        id: a._id,
        name: a.employee?.name || 'Employee',
        action: a.status === 'present' ? 'checked in' : a.status === 'leave' ? 'on leave' : a.status,
        time: new Date(a.date).toLocaleDateString(),
        status: a.status
      }));
    
    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          presentToday,
          absentToday,
          onLeaveToday,
          totalLeaves,
          activeProjects,
          avgWorkHours,
          growth: growth > 0 ? `+${growth}` : growth
        },
        monthlyData,
        attendanceTypes,
        recentActivity
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
});

// Get real-time attendance stats
router.get('/realtime', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.find({
      date: { $gte: today }
    }).populate('employee', 'name');
    
    const stats = {
      present: todayAttendance.filter(a => a.status === 'present').length,
      absent: todayAttendance.filter(a => a.status === 'absent').length,
      leave: todayAttendance.filter(a => a.status === 'leave').length,
      late: todayAttendance.filter(a => a.status === 'late').length,
      lastUpdated: new Date()
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch real-time stats' });
  }
});

module.exports = router;
