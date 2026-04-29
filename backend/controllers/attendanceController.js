const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');

// Helper function to emit notification via socket
const emitNotification = (io, userId, notification) => {
  if (io) {
    io.emit('receive_notification', { userId, notification });
  }
};

// @desc    Mark attendance for today
// @route   POST /api/attendance/mark
// @access  Private (Employee only)
const markAttendance = async (req, res) => {
  try {
    const { status = 'Present', notes = '' } = req.body;
    const userId = req.user.id;

    // Find the employee associated with this user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find employee by email (matching user email with employee email)
    const employee = await Employee.findOne({ email: user.email });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found. Please contact admin.'
      });
    }

    // Check if today is a holiday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    
    console.log('Checking for holiday on:', today, 'year:', year);
    
    try {
      const holiday = await Holiday.findOne({
        date: today,
        year: year,
        isActive: true
      });

      if (holiday) {
        console.log('Holiday found:', holiday.name);
        return res.status(400).json({
          success: false,
          message: `Today is a holiday: ${holiday.name}. Attendance not required.`,
          isHoliday: true,
          holiday: holiday
        });
      }
      console.log('No holiday found for today');
    } catch (holidayError) {
      console.error('Error checking holiday:', holidayError);
      // Continue even if holiday check fails
    }

    // Check if attendance already marked for today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today',
        data: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      employeeId: employee._id,
      userId: userId,
      date: new Date(),
      status,
      checkInTime: new Date(),
      isActive: true,
      notes
    });

    // Create notification for admin
    console.log('📩 Creating attendance notification for admin...');
    const admins = await User.find({ role: 'admin' }).select('_id');
    
    // Create notification for each admin
    for (const admin of admins) {
      await Notification.create({
        type: 'attendance',
        title: 'Attendance Marked',
        message: `${employee.name} (${employee.email}) has marked attendance for today at ${new Date().toLocaleTimeString()}`,
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        senderId: userId,
        receiverId: admin._id
      });
    }
    console.log('✅ Attendance notifications created for admins');

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check out (update checkout time)
// @route   PUT /api/attendance/checkout
// @access  Private (Employee only)
const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the employee associated with this user
    const user = await User.findById(userId);
    const employee = await Employee.findOne({ email: user.email });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found'
      });
    }

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for today. Please mark attendance first.'
      });
    }

    // Update checkout time and calculate work hours
    const checkOutTime = new Date();
    const workHours = (checkOutTime - attendance.checkInTime) / (1000 * 60 * 60); // hours

    attendance.checkOutTime = checkOutTime;
    attendance.workHours = parseFloat(workHours.toFixed(2));
    attendance.isActive = false;
    await attendance.save();

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get my attendance status for today
// @route   GET /api/attendance/my-today
// @access  Private (Employee only)
const getMyTodayAttendance = async (req, res) => {
  try {
    console.log('=== getMyTodayAttendance DEBUG ===');
    console.log('req.user:', req.user);
    const userId = req.user.id || req.user.userId;
    console.log('userId:', userId);

    const user = await User.findById(userId);
    console.log('user found:', user ? 'YES' : 'NO');
    
    const employee = await Employee.findOne({ email: user.email });
    console.log('employee found:', employee ? 'YES' : 'NO');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found'
      });
    }

    console.log('Calling Attendance.getTodayAttendance with:', employee._id);
    console.log('Attendance model:', Attendance);
    console.log('Attendance.getTodayAttendance:', Attendance.getTodayAttendance);
    
    const attendance = await Attendance.getTodayAttendance(employee._id);
    console.log('attendance result:', attendance);

    res.json({
      success: true,
      hasAttendance: !!attendance,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get all employees with today's attendance status
// @route   GET /api/attendance/today
// @access  Private (Admin/Employee)
const getTodayAllAttendance = async (req, res) => {
  try {
    // Allow both admin and employee roles
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId || req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all employees
    const employees = await Employee.find().sort({ createdAt: -1 });

    // Get today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    // Map attendance to employees
    const attendanceMap = {};
    attendances.forEach(att => {
      attendanceMap[att.employeeId._id.toString()] = att;
    });

    // Create response with attendance status
    const employeesWithAttendance = employees.map(emp => {
      const empObj = emp.toObject();
      const hasAttendance = !!attendanceMap[emp._id.toString()];
      
      return {
        ...empObj,
        attendanceStatus: hasAttendance ? 'active' : 'inactive',
        attendanceToday: attendanceMap[emp._id.toString()] || null
      };
    });

    res.json({
      success: true,
      count: employeesWithAttendance.length,
      activeCount: employeesWithAttendance.filter(e => e.attendanceStatus === 'active').length,
      inactiveCount: employeesWithAttendance.filter(e => e.attendanceStatus === 'inactive').length,
      data: employeesWithAttendance
    });
  } catch (error) {
    console.error('Get today all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get today's attendance status for all employees (for admin) or own data (for employee)
// @route   GET /api/attendance/today-status
// @access  Private
const getTodayAttendanceStatus = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let employees;
    
    // All logged-in users see all employees
    employees = await Employee.find().sort({ createdAt: -1 });

    // Get today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    // Map attendance to employees
    const attendanceMap = {};
    attendances.forEach(att => {
      if (att.employeeId && att.employeeId._id) {
        attendanceMap[att.employeeId._id.toString()] = att;
      }
    });

    // Create response with active/inactive status
    const employeesWithStatus = employees.map(emp => {
      const empObj = emp.toObject();
      const attendance = attendanceMap[emp._id.toString()];
      
      // Determine status: checked in = active, checked out or no attendance = inactive
      let status = 'inactive';
      if (attendance) {
        status = attendance.isActive ? 'active' : 'inactive';
      }
      
      return {
        ...empObj,
        attendanceStatus: status,
        attendanceToday: attendance ? {
          ...attendance.toObject(),
          status: attendance.status || 'Present'  // Add status field
        } : null,
        isCheckedIn: attendance ? attendance.isActive : false,
        checkInTime: attendance ? attendance.checkInTime : null,
        checkOutTime: attendance ? attendance.checkOutTime : null
      };
    });

    res.json({
      success: true,
      count: employeesWithStatus.length,
      activeCount: employeesWithStatus.filter(e => e.attendanceStatus === 'active').length,
      inactiveCount: employeesWithStatus.filter(e => e.attendanceStatus === 'inactive').length,
      data: employeesWithStatus
    });
  } catch (error) {
    console.error('Get today attendance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance history for an employee
// @route   GET /api/attendance/history/:employeeId
// @access  Private
const getAttendanceHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { employeeId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employeeId', 'name email employeeId');

    res.json({
      success: true,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Admin mark attendance for any employee
// @route   POST /api/attendance/admin-mark
// @access  Admin only
const adminMarkAttendance = async (req, res) => {
  try {
    const { employeeId, status = 'Present', notes = '' } = req.body;
    const adminUserId = req.user.id;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find the employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if attendance already marked for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today',
        data: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      employeeId: employee._id,
      userId: adminUserId,
      date: new Date(),
      status,
      checkInTime: new Date(),
      isActive: true,
      notes: notes || `Marked by admin: ${req.user.email}`
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${employee.name}`,
      data: attendance
    });
  } catch (error) {
    console.error('Admin mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance by specific date (for calendar view)
// @route   GET /api/attendance/by-date
// @access  Private
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('=== Get Attendance By Date ===');
    console.log('Selected date:', selectedDate);
    
    // Get all employees
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    // Get attendance records for selected date
    const attendances = await Attendance.find({
      date: { $gte: selectedDate, $lt: nextDay }
    }).populate('employeeId', 'name email employeeId designation');
    
    console.log('Found attendances:', attendances.length);
    
    // Map attendance to employees
    const attendanceMap = {};
    attendances.forEach(att => {
      if (att.employeeId && att.employeeId._id) {
        attendanceMap[att.employeeId._id.toString()] = att;
      }
    });
    
    // Create response with attendance status
    const employeesWithAttendance = employees.map(emp => {
      const empObj = emp.toObject();
      const attendance = attendanceMap[emp._id.toString()];
      
      let status = 'inactive';
      if (attendance) {
        status = attendance.isActive ? 'active' : 'inactive';
      }
      
      return {
        ...empObj,
        attendanceStatus: status,
        attendanceData: attendance ? {
          ...attendance.toObject(),
          status: attendance.status || 'Present',
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          workHours: attendance.workHours
        } : null
      };
    });
    
    // Calculate stats
    const presentCount = attendances.filter(a => a.status === 'Present').length;
    const absentCount = employees.length - presentCount;
    const onLeaveCount = attendances.filter(a => a.status === 'Leave').length;
    
    res.json({
      success: true,
      date: selectedDate,
      total: employees.length,
      present: presentCount,
      absent: absentCount,
      onLeave: onLeaveCount,
      data: employeesWithAttendance
    });
  } catch (error) {
    console.error('Get attendance by date error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance stats (present/absent count for today)
// @route   GET /api/attendance/stats
// @access  Private (All authenticated users)
const getAttendanceStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active employees count
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });

    // Get today's attendance count
    const presentCount = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });

    // Calculate absent count
    const absentCount = totalEmployees - presentCount;
    
    // Debug logging
    console.log('=== Attendance Stats Debug ===');
    console.log('Date:', today);
    console.log('Total Active Employees:', totalEmployees);
    console.log('Present Today:', presentCount);
    console.log('Absent Today:', absentCount);
    
    // Get all employees and their attendance status for detailed view
    const allEmployees = await Employee.find({ status: 'Active' });
    const todayAttendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email');
    
    console.log('All Active Employees:', allEmployees.map(e => ({ id: e._id.toString(), name: e.name })));
    console.log('Today Attendances:', todayAttendances.map(a => ({ 
      employeeId: a.employeeId?._id?.toString(), 
      name: a.employeeId?.name,
      status: a.status 
    })));

    res.json({
      success: true,
      date: today,
      total: totalEmployees,
      present: presentCount,
      absent: absentCount > 0 ? absentCount : 0
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance calendar data for a month
// @route   GET /api/attendance/calendar
// @access  Private
const getCalendarData = async (req, res) => {
  try {
    console.log('=== CALENDAR API DEBUG ===');
    console.log('Query params:', req.query);
    console.log('User ID:', req.user.id);
    console.log('User role:', req.user.role);
    
    const { year, month, employeeId } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Build date range for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    console.log('Date range:', { startDate, endDate });

    let query = {
      date: { $gte: startDate, $lte: endDate }
    };

    // If not admin and no employeeId specified, show only user's attendance
    if (!isAdmin && !employeeId) {
      console.log('Finding employee for user...');
      const user = await User.findById(userId);
      const employee = await Employee.findOne({ email: user.email });
      console.log('Found employee:', employee ? employee.name : 'Not found');
      if (employee) {
        query.employeeId = employee._id;
      }
    }

    // If specific employee requested
    if (employeeId) {
      query.employeeId = employeeId;
    }

    console.log('Final query:', query);
    const attendances = await Attendance.find(query)
      .populate('employeeId', 'name email employeeId')
      .sort({ date: 1 });

    console.log('Found attendances:', attendances.length);
    console.log('Attendance data:', attendances.map(a => ({ date: a.date, status: a.status })));

    // Calculate stats
    const presentCount = attendances.filter(a => a.status === 'Present').length;
    const absentCount = attendances.filter(a => a.status === 'Absent').length;
    const halfDayCount = attendances.filter(a => a.status === 'Half-Day').length;
    const leaveCount = attendances.filter(a => a.status === 'Leave').length;

    const result = {
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      data: attendances,
      presentCount,
      absentCount,
      halfDayCount,
      leaveCount
    };
    
    console.log('Sending result:', result);
    res.json(result);
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Apply for leave
// @route   POST /api/attendance/leave/apply
// @access  Private (Employee only)
const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
    }

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    const hasOverlap = await Leave.hasOverlappingLeave(employee._id, start, end);
    if (hasOverlap) {
      return res.status(400).json({ success: false, message: 'You already have a leave for these dates' });
    }

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employeeId: employee._id,
      userId: userId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: 'Pending'
    });
    console.log('📩 Creating leave notification for admin...');
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' }).select('_id');
    console.log('📋 Found', admins.length, 'admins');
    
    // Create notification for each admin
    const leaveNotifications = [];
    for (const admin of admins) {
      console.log('📝 Creating notification for admin:', admin._id);
      const adminNotification = await Notification.create({
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employee.name} applied for ${leaveType} (${totalDays} days)`,
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        senderId: employee._id,
        senderName: employee.name,
        receiverId: admin._id,
        link: `/employees/${employee._id}`
      });
      leaveNotifications.push(adminNotification);
      console.log('✅ Notification created:', adminNotification._id);
    }
    console.log('✅ Leave notifications created for admins');

    // Emit real-time notification to all admin users
    const io = req.app.get('io');
    console.log('🔌 IO instance:', io ? 'Available' : 'Not available');
    if (io) {
      const onlineUsersMap = io.onlineUsers;
      console.log('👥 Online users map:', onlineUsersMap ? 'Available' : 'Not available');

      for (const admin of admins) {
        const adminId = admin._id.toString();
        const adminOnline = onlineUsersMap ? onlineUsersMap.get(adminId) : null;
        console.log(`🔍 Admin ${adminId} online:`, adminOnline ? 'Yes' : 'No');
        if (adminOnline && adminOnline.isOnline) {
          const notification = leaveNotifications.find(n => n.receiverId.toString() === adminId);
          if (notification) {
            io.to(adminOnline.socketId).emit('newNotification', {
              id: notification._id,
              type: 'leave_request',
              title: 'New Leave Request',
              message: `${employee.name} applied for ${leaveType} (${totalDays} days)`,
              senderId: employee._id,
              senderName: employee.name,
              employeeId: employee._id,
              employeeName: employee.name,
              leaveId: leave._id,
              link: `/employees/${employee._id}`,
              createdAt: new Date(),
              read: false
            });
            console.log(`📢 Leave notification emitted to admin ${adminId}`);
          }
        } else {
          console.log(`⚠️ Admin ${adminId} not online, notification not emitted`);
        }
      }

      // Also emit legacy event for backward compatibility
      io.emit('new_leave_request', {
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employee.name} applied for ${leaveType} (${totalDays} days)`,
        employeeId: employee._id,
        employeeName: employee.name,
        leaveId: leave._id,
        createdAt: new Date()
      });
    }

    res.status(201).json({ success: true, message: 'Leave applied successfully', data: leave });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get my leaves
// @route   GET /api/attendance/leave/my-leaves
// @access  Private (Employee only)
const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const employee = await Employee.findOne({ email: user.email });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const leaves = await Leave.find({ employeeId: employee._id }).sort({ appliedOn: -1 });

    // Calculate leave balance
    const currentYear = new Date().getFullYear();
    const leaveStats = await Leave.getLeaveStats(employee._id, currentYear);
    
    const leaveLimits = {
      'Casual Leave': 12,
      'Sick Leave': 10,
      'Paid Leave': 15,
      'Emergency Leave': 5,
      'Unpaid Leave': 365
    };

    const balance = {};
    Object.keys(leaveLimits).forEach(type => {
      const used = leaveStats.find(s => s._id === type)?.totalDays || 0;
      balance[type] = {
        total: leaveLimits[type],
        used: used,
        remaining: leaveLimits[type] - used
      };
    });

    res.json({ success: true, count: leaves.length, data: leaves, balance });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all leaves (Admin)
// @route   GET /api/attendance/leave/all
// @access  Private (Admin only)
const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email employeeId designation')
      .sort({ appliedOn: -1 });

    const stats = {
      total: await Leave.countDocuments(),
      pending: await Leave.countDocuments({ status: 'Pending' }),
      approved: await Leave.countDocuments({ status: 'Approved' }),
      rejected: await Leave.countDocuments({ status: 'Rejected' })
    };

    res.json({ success: true, stats, data: leaves });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve/Reject leave (Admin)
// @route   PUT /api/attendance/leave/approve/:leaveId
// @access  Private (Admin only)
const approveRejectLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = req.user.userId || req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const leave = await Leave.findById(leaveId).populate('employeeId', 'name email');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status === 'Rejected' || leave.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: `Leave already ${leave.status}` });
    }

    leave.status = status;
    leave.approvedBy = adminId;
    leave.approvedOn = new Date();
    if (status === 'Rejected') leave.rejectionReason = rejectionReason;
    await leave.save();

    console.log('📩 Creating leave status notification for employee...');
    
    // Notify employee about leave approval/rejection
    const notificationType = status === 'Approved' ? 'leave_approved' : 'leave_rejected';
    const employeeNotification = await Notification.create({
      type: notificationType,
      title: `Leave ${status}`,
      message: `Your ${leave.leaveType} has been ${status.toLowerCase()}`,
      employeeId: leave.employeeId._id,
      employeeName: leave.employeeId.name,
      employeeEmail: leave.employeeId.email,
      senderId: adminId,
      senderName: 'Admin',
      receiverId: leave.userId,
      link: '/attendance'
    });
    console.log('✅ Employee notification created:', employeeNotification._id);

    // Send email notification to employee
    const { sendLeaveApprovalEmail, sendLeaveRejectionEmail } = require('../utils/emailService');
    try {
      if (status === 'Approved') {
        await sendLeaveApprovalEmail(
          leave.employeeId.email,
          leave.employeeId.name,
          leave.leaveType,
          leave.startDate,
          leave.endDate
        );
      } else if (status === 'Rejected') {
        await sendLeaveRejectionEmail(
          leave.employeeId.email,
          leave.employeeId.name,
          leave.leaveType,
          rejectionReason
        );
      }
    } catch (emailError) {
      console.error('Failed to send leave status email:', emailError.message);
    }

    // Emit real-time notification to the employee
    const io = req.app.get('io');
    console.log('🔌 IO instance:', io ? 'Available' : 'Not available');
    if (io) {
      const onlineUsersMap = io.onlineUsers;
      console.log('👥 Online users map:', onlineUsersMap ? 'Available' : 'Not available');
      
      const employeeUserId = leave.userId?.toString();
      console.log(`🔍 Employee user ID:`, employeeUserId);
      
      if (employeeUserId && onlineUsersMap) {
        const empOnline = onlineUsersMap.get(employeeUserId);
        console.log(`🔍 Employee ${employeeUserId} online:`, empOnline ? 'Yes' : 'No');
        if (empOnline && empOnline.isOnline) {
          io.to(empOnline.socketId).emit('newNotification', {
            id: employeeNotification._id,
            type: 'leave_request',
            title: `Leave ${status}`,
            message: `Your ${leave.leaveType} has been ${status.toLowerCase()}`,
            senderId: adminId,
            senderName: 'Admin',
            leaveId: leave._id,
            status: status,
            link: '/attendance',
            createdAt: new Date(),
            read: false
          });
          console.log(`📢 Leave status notification emitted to employee ${employeeUserId}`);
        } else {
          console.log(`⚠️ Employee ${employeeUserId} not online, notification not emitted`);
        }
      }

      // Also emit legacy event for backward compatibility
      io.emit('leave_status_updated', {
        userId: leave.userId,
        employeeId: leave.employeeId.toString(),
        notification: {
          type: 'leave_request',
          title: `Leave ${status}`,
          message: `Your ${leave.leaveType} has been ${status.toLowerCase()}`,
          leaveId: leave._id,
          status: status,
          createdAt: new Date(),
          read: false
        }
      });
    }

    res.json({ success: true, message: `Leave ${status.toLowerCase()}`, data: leave });
  } catch (error) {
    console.error('Approve/Reject leave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Cancel my leave
// @route   PUT /api/attendance/leave/cancel/:leaveId
// @access  Private (Employee only)
const cancelLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const employee = await Employee.findOne({ email: user.email });

    const leave = await Leave.findOne({ _id: leaveId, employeeId: employee._id });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Cannot cancel approved leave' });
    }

    leave.status = 'Cancelled';
    await leave.save();

    res.json({ success: true, message: 'Leave cancelled', data: leave });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get pending leaves count (for admin popup)
// @route   GET /api/attendance/leave/pending-count
// @access  Private (Admin only)
const getPendingLeavesCount = async (req, res) => {
  try {
    const count = await Leave.getPendingLeavesCount();
    const pendingLeaves = await Leave.getPendingLeaves();
    res.json({ success: true, count, data: pendingLeaves });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Apply for leave with auto-approval
// @route   POST /api/attendance/leave/apply-auto
// @access  Private (Employee only)
const applyLeaveAuto = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const employee = await Employee.findOne({ email: user.email });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ success: false, message: 'Cannot apply leave for past dates' });
    }

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Check overlapping leaves
    const overlapping = await Leave.hasOverlappingLeave(employee._id, start, end);
    if (overlapping) {
      return res.status(400).json({ success: false, message: 'You already have a leave applied for these dates' });
    }

    // Calculate total days
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Create leave with PENDING status (admin will approve)
    const leave = await Leave.create({
      employeeId: employee._id,
      userId: userId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: 'Pending',
      appliedOn: new Date()
    });

    console.log('📩 Creating leave notification for admin (auto-apply)...');
    const admins = await User.find({ role: 'admin' }).select('_id');
    console.log('📋 Found', admins.length, 'admins');
    
    // Create notification for each admin
    const leaveNotifications = [];
    for (const admin of admins) {
      console.log('📝 Creating notification for admin:', admin._id);
      const adminNotification = await Notification.create({
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employee.name} applied for ${leaveType} (${totalDays} days)`,
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        senderId: employee._id,
        senderName: employee.name,
        receiverId: admin._id,
        link: `/employees/${employee._id}`
      });
      leaveNotifications.push(adminNotification);
      console.log('✅ Notification created:', adminNotification._id);
    }
    console.log('✅ Leave notifications created for admins');

    // Emit real-time notification to all admin users
    const io = req.app.get('io');
    console.log('🔌 IO instance:', io ? 'Available' : 'Not available');
    if (io) {
      const onlineUsersMap = io.onlineUsers;
      console.log('👥 Online users map:', onlineUsersMap ? 'Available' : 'Not available');

      for (const admin of admins) {
        const adminId = admin._id.toString();
        const adminOnline = onlineUsersMap ? onlineUsersMap.get(adminId) : null;
        console.log(`🔍 Admin ${adminId} online:`, adminOnline ? 'Yes' : 'No');
        if (adminOnline && adminOnline.isOnline) {
          const notification = leaveNotifications.find(n => n.receiverId.toString() === adminId);
          if (notification) {
            io.to(adminOnline.socketId).emit('newNotification', {
              id: notification._id,
              type: 'leave_request',
              title: 'New Leave Request',
              message: `${employee.name} applied for ${leaveType} (${totalDays} days)`,
              senderId: employee._id,
              senderName: employee.name,
              employeeId: employee._id,
              employeeName: employee.name,
              leaveId: leave._id,
              link: `/employees/${employee._id}`,
              createdAt: new Date(),
              read: false
            });
            console.log(`📢 Leave notification emitted to admin ${adminId}`);
          }
        } else {
          console.log(`⚠️ Admin ${adminId} not online, notification not emitted`);
        }
      }
    }

    res.status(201).json({ success: true, message: 'Leave applied successfully. Pending admin approval.', data: leave });
  } catch (error) {
    console.error('Apply leave auto error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  markAttendance,
  checkOut,
  getMyTodayAttendance,
  getTodayAllAttendance,
  getTodayAttendanceStatus,
  getAttendanceHistory,
  adminMarkAttendance,
  getAttendanceStats,
  getCalendarData,
  applyLeave,
  applyLeaveAuto,
  getMyLeaves,
  getAllLeaves,
  approveRejectLeave,
  cancelLeave,
  getPendingLeavesCount,
  getAttendanceByDate
};
