const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// @desc    Get all dashboard stats in one API call
// @route   GET /api/dashboard
// @access  Private (Admin/Employee)
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all queries in parallel for better performance
    const [
      totalUsers,
      totalEmployees,
      totalAttendance,
      presentToday,
      absentToday
    ] = await Promise.all([
      // Count total users
      User.countDocuments(),
      
      // Count total employees
      Employee.countDocuments(),
      
      // Count total attendance records
      Attendance.countDocuments(),
      
      // Count present employees today
      Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: 'Present'
      }),
      
      // Count absent employees today
      Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: 'Absent'
      })
    ]);

    // Get recent employees (last 5)
    const recentEmployees = await Employee.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email designation role status createdAt');

    // Get today's attendance list with employee details
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
    .populate('employeeId', 'name email designation')
    .sort({ checkInTime: -1 })
    .limit(10);

    // Calculate active employees (present today)
    const activeEmployees = presentToday;

    // Calculate inactive employees (not marked attendance today)
    const inactiveEmployees = totalEmployees - presentToday;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalEmployees,
        totalAttendance,
        presentToday,
        absentToday,
        activeEmployees,
        inactiveEmployees,
        recentEmployees,
        todayAttendance,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get dashboard stats for specific date range
// @route   GET /api/dashboard/range
// @access  Private (Admin only)
const getDashboardStatsByRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const stats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInRange = await Attendance.countDocuments({
      date: { $gte: start, $lte: end }
    });

    res.status(200).json({
      success: true,
      data: {
        dateRange: { startDate: start, endDate: end },
        totalAttendance: totalInRange,
        statusBreakdown: stats,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard range stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard range stats',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardStatsByRange
};
