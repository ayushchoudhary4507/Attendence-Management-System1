const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');

// @desc    Get public landing page statistics
// @route   GET /api/public/landing-stats
// @access  Public (No authentication required)
const getLandingPageStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total counts
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const totalUsers = await User.countDocuments();
    
    // Get today's attendance stats
    const todayAttendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email');

    const presentCount = todayAttendances.filter(a => a.status === 'Present').length;
    const onLeaveCount = todayAttendances.filter(a => a.status === 'Leave').length;
    const absentCount = totalEmployees - presentCount - onLeaveCount;
    
    // Calculate percentages
    const presentPercentage = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
    const onTimePercentage = presentCount > 0 ? Math.round((presentCount * 0.9)) : 0; // Estimate 90% of present are on time
    const lateCount = presentCount - onTimePercentage;
    
    // Get last 15 days attendance data for chart
    const chartData = [];
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayAttendances = await Attendance.countDocuments({
        date: { $gte: date, $lt: nextDate },
        status: 'Present'
      });
      
      const dayLabel = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const percentage = totalEmployees > 0 ? Math.round((dayAttendances / totalEmployees) * 100) : 0;
      
      chartData.push({
        day: dayLabel,
        value: percentage
      });
    }

    // Calculate trends (compare with yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(today);
    
    const yesterdayAttendances = await Attendance.countDocuments({
      date: { $gte: yesterday, $lt: yesterdayEnd },
      status: 'Present'
    });
    
    const todayPresentCount = presentCount;
    const presentChange = yesterdayAttendances > 0 
      ? Math.round(((todayPresentCount - yesterdayAttendances) / yesterdayAttendances) * 100)
      : 0;

    const stats = {
      totalEmployees: {
        value: totalEmployees,
        change: `+${Math.max(1, Math.abs(presentChange))}%`,
        trend: presentChange >= 0 ? 'up' : 'down',
      
      },
      onTime: {
        value: onTimePercentage,
        change: `+${Math.max(1, Math.abs(presentChange + 2))}%`,
        trend: 'up',
        
      },
      lateArrival: {
        value: Math.max(0, lateCount),
        change: `${presentChange >= 0 ? '-' : '+'}${Math.max(1, Math.abs(presentChange - 1))}%`,
        trend: presentChange >= 0 ? 'down' : 'up',
        
      },
      earlyDepartures: {
        value: Math.max(0, Math.floor(presentCount * 0.02)), // Estimate 2% early departures
        change: '-10%',
        trend: 'down',
        
      }
    };

    res.json({
      success: true,
      data: {
        stats,
        chartData,
        summary: {
          totalEmployees,
          presentToday: presentCount,
          absentToday: Math.max(0, absentCount),
          onLeaveToday: onLeaveCount,
          presentPercentage
        }
      }
    });
  } catch (error) {
    console.error('Get landing page stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getLandingPageStats
};
