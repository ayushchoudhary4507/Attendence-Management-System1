const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');

// Helper function to get start and end of today spanning local date and UTC date safely
const getTodayDateRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const startLocal = new Date(y, m, d, 0, 0, 0, 0);
  const endLocal = new Date(y, m, d + 1, 0, 0, 0, 0);

  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  const start = new Date(Math.min(startLocal.getTime(), startUtc.getTime()));
  const end = new Date(Math.max(endLocal.getTime(), endUtc.getTime()));
  return { start, end };
};

// Helper function to check if check-in is late arrival (after 09:30 AM)
const isLateArrival = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return hours > 9 || (hours === 9 && minutes > 30);
};

// Helper function to emit notification and real-time attendance stats via socket
const emitNotification = (io, userId, notification) => {
  if (io) {
    io.emit('receive_notification', { userId, notification });
  }
};

// Broadcast real-time attendance updates to web dashboard and mobile app
const broadcastAttendanceUpdate = async (req, attendanceRecord, employee, action = 'marked') => {
  try {
    const io = req.app?.get('io');
    if (io) {
      const { start, end } = getTodayDateRange();
      const totalEmployees = await Employee.countDocuments({ status: 'Active' });
      const todayAttendances = await Attendance.find({
        date: { $gte: start, $lt: end }
      }).populate('employeeId', 'name email employeeId designation');

      const presentCount = todayAttendances.filter(a => a.status === 'Present').length;
      const onLeaveCount = todayAttendances.filter(a => a.status === 'Leave').length;
      const lateCount = todayAttendances.filter(a => a.checkInTime && isLateArrival(a.checkInTime)).length;
      const activeNowCount = todayAttendances.filter(a => a.isActive).length;
      const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

      const stats = {
        total: totalEmployees,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        lateArrival: lateCount,
        onLeave: onLeaveCount,
        activeNow: activeNowCount,
        lastUpdated: new Date()
      };

      console.log('📡 [Realtime Sync] Emitting attendance_updated and attendance_stats_updated:', stats);
      io.emit('attendance_updated', {
        action,
        attendance: attendanceRecord,
        employee: {
          _id: employee?._id,
          name: employee?.name,
          email: employee?.email,
          employeeId: employee?.employeeId
        },
        stats
      });
      io.emit('attendance_stats_updated', stats);
    }
  } catch (err) {
    console.error('Error broadcasting attendance update:', err);
  }
};

// @desc    Mark attendance for today
// @route   POST /api/attendance/mark
// @access  Private (Employee only)
const markAttendance = async (req, res) => {
  try {
    console.log('----------------------------------------------------');
    console.log('📥 [Attendance Flow] POST /api/attendance/mark');
    console.log('Request Body:', JSON.stringify(req.body));
    
    const { 
      status: rawStatus, 
      attendanceStatus, 
      notes = '', 
      attendanceMethod, 
      verificationMethod: rawMethod,
      latitude, 
      longitude, 
      accuracy,
      address,
      checkInTime: rawCheckIn,
      checkIn: rawCheckInAlt,
      date: rawDate
    } = req.body;

    const status = rawStatus || attendanceStatus || 'Present';
    const userId = req.user?.id || req.user?.userId || req.user?._id;

    // Resolve user and employee
    let user = null;
    let employee = null;

    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        employee = await Employee.findById(userId);
      }
    }

    if (!user && (req.body.email || req.body.userEmail)) {
      const email = (req.body.email || req.body.userEmail).trim();
      user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
      employee = employee || await Employee.findOne({ email: new RegExp(`^${email}$`, 'i') });
    }

    if (!employee && (req.body.employeeId || req.body.id)) {
      const empId = req.body.employeeId || req.body.id;
      if (mongoose.isValidObjectId(empId)) {
        employee = await Employee.findById(empId);
      }
    }

    if (user && !employee) {
      employee = await Employee.findOne({ email: new RegExp(`^${user.email.trim()}$`, 'i') });
    } else if (employee && !user) {
      user = await User.findOne({ email: new RegExp(`^${employee.email.trim()}$`, 'i') });
    }

    if (!employee && !user) {
      return res.status(404).json({
        success: false,
        message: 'Employee or User profile not found. Please verify authentication.'
      });
    }

    // Ensure we have IDs for both
    const finalEmployeeId = employee?._id || user?._id;
    const finalUserId = user?._id || employee?._id;
    const employeeName = employee?.name || user?.name || 'Employee';
    const employeeEmail = employee?.email || user?.email || '';

    // Check if today is a holiday
    const { start: today, end: tomorrow } = getTodayDateRange();
    const year = today.getFullYear();
    
    try {
      const holiday = await Holiday.findOne({
        date: today,
        year: year,
        isActive: true
      });

      if (holiday) {
        return res.status(400).json({
          success: false,
          message: `Today is a holiday: ${holiday.name}. Attendance not required.`,
          isHoliday: true,
          holiday: holiday
        });
      }
    } catch (holidayError) {
      console.error('Error checking holiday:', holidayError);
    }

    // Check if attendance already marked for today
    const existingAttendance = await Attendance.findOne({
      $or: [
        { employeeId: finalEmployeeId },
        { userId: finalUserId }
      ],
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    if (existingAttendance) {
      console.log('⚠️ [Attendance Flow] Duplicate check: attendance already exists for today');
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: 'Attendance already marked for today',
        data: existingAttendance,
        attendance: existingAttendance
      });
    }

    // Always use authoritative real-time server timestamp (UTC) for live check-in
    const checkInDate = new Date();
    const isLate = isLateArrival(checkInDate);

    // Normalize verification method
    let method = rawMethod || attendanceMethod || 'manual';
    const lowerMethod = method.toString().toLowerCase();
    if (lowerMethod.includes('face')) {
      method = 'face_recognition';
    } else if (lowerMethod.includes('gps') || lowerMethod.includes('geo')) {
      method = 'geolocation';
    } else if (lowerMethod.includes('qr')) {
      method = 'qr_code';
    }

    const locationData = (latitude && longitude) ? {
      latitude,
      longitude,
      accuracy: accuracy || null,
      address: address || 'Mobile GPS Check-in',
      isWithinOfficeRadius: true
    } : (req.body.location || null);

    // Create new attendance record
    const attendance = await Attendance.create({
      employeeId: finalEmployeeId,
      userId: finalUserId,
      date: new Date(),
      status,
      checkInTime: checkInDate,
      isActive: true,
      notes: notes || (isLate ? 'Standard Check-in (Late Arrival)' : 'Standard Check-in'),
      verificationMethod: method,
      location: locationData
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    // Create notification for admins
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          type: 'attendance',
          title: 'Attendance Marked',
          message: `${employeeName} (${employeeEmail}) has marked attendance at ${checkInDate.toLocaleTimeString()} (${isLate ? 'Late Arrival' : 'On Time'})`,
          employeeId: finalEmployeeId,
          employeeName: employeeName,
          employeeEmail: employeeEmail,
          senderId: finalUserId,
          receiverId: admin._id
        });
      }
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    // Broadcast realtime update
    await broadcastAttendanceUpdate(req, populatedAttendance, employee || { _id: finalEmployeeId, name: employeeName, email: employeeEmail }, 'marked');

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully (${isLate ? 'Late Arrival' : 'On Time'})`,
      data: populatedAttendance,
      attendance: populatedAttendance,
      isLate
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Check out (update checkout time)
// @route   PUT /api/attendance/checkout
// @access  Private (Employee only)
const checkOut = async (req, res) => {
  try {
    console.log('----------------------------------------------------');
    console.log('📤 [Attendance Flow] PUT /api/attendance/checkout');
    const userId = req.user.id || req.user.userId;

    let user = await User.findById(userId);
    let employee = null;
    if (user) {
      employee = await Employee.findOne({ email: new RegExp(`^${user.email.trim()}$`, 'i') });
    } else {
      employee = await Employee.findById(userId);
      if (employee) {
        user = await User.findOne({ email: new RegExp(`^${employee.email.trim()}$`, 'i') });
      }
    }

    if (!user && !employee) {
      return res.status(404).json({ success: false, message: 'User or Employee profile not found' });
    }

    const { start: today, end: tomorrow } = getTodayDateRange();
    const idFilters = [];
    if (employee) idFilters.push({ employeeId: employee._id });
    if (user) idFilters.push({ userId: user._id });

    const attendance = await Attendance.findOne({
      $or: idFilters,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for today. Please mark attendance first.'
      });
    }

    const checkOutTime = new Date();
    const workHours = (checkOutTime - new Date(attendance.checkInTime)) / (1000 * 60 * 60);

    attendance.checkOutTime = checkOutTime;
    attendance.workHours = parseFloat(Math.max(0, workHours).toFixed(2));
    attendance.isActive = false;
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    // Real-time synchronization broadcast across all devices/apps
    await broadcastAttendanceUpdate(req, populatedAttendance, employee, 'checked_out');

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get my attendance status for today
// @route   GET /api/attendance/my-today
// @access  Private (Employee only)
const getMyTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('🔍 [Attendance Flow] GET /api/attendance/my-today for userId:', userId);

    let user = await User.findById(userId);
    let employee = null;
    if (user) {
      employee = await Employee.findOne({ email: new RegExp(`^${user.email.trim()}$`, 'i') });
    } else {
      employee = await Employee.findById(userId);
      if (employee) {
        user = await User.findOne({ email: new RegExp(`^${employee.email.trim()}$`, 'i') });
      }
    }

    if (!user && !employee) {
      return res.status(404).json({
        success: false,
        message: 'User or Employee profile not found'
      });
    }

    const { start: today, end: tomorrow } = getTodayDateRange();

    const idFilters = [];
    if (user) idFilters.push({ userId: user._id });
    if (employee) idFilters.push({ employeeId: employee._id });

    const attendance = await Attendance.findOne({
      $or: idFilters,
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    console.log('✅ [Attendance Flow] Today attendance for', user?.email || employee?.email, '=>', attendance ? attendance.status : 'None');

    res.json({
      success: true,
      hasAttendance: !!attendance,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
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
    const { start: today, end: tomorrow } = getTodayDateRange();

    // Get all employees
    const employees = await Employee.find().sort({ createdAt: -1 });

    // Get today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    // Map attendance to employees by employeeId, userId, and email
    const attendanceByEmpId = {};
    const attendanceByUserId = {};
    const attendanceByEmail = {};

    attendances.forEach(att => {
      const empIdStr = att.employeeId?._id ? att.employeeId._id.toString() : (att.employeeId ? att.employeeId.toString() : null);
      if (empIdStr) attendanceByEmpId[empIdStr] = att;
      if (att.userId) attendanceByUserId[att.userId.toString()] = att;
      if (att.employeeId?.email) {
        attendanceByEmail[att.employeeId.email.toLowerCase().trim()] = att;
      }
    });

    // Create response with attendance status
    const employeesWithAttendance = employees.map(emp => {
      const empObj = emp.toObject();
      const empEmail = emp.email ? emp.email.toLowerCase().trim() : '';
      const attendance = attendanceByEmpId[emp._id.toString()] ||
                         attendanceByUserId[emp._id.toString()] ||
                         (emp.userId ? attendanceByUserId[emp.userId.toString()] : null) ||
                         attendanceByEmail[empEmail];

      const isPresent = attendance && (attendance.status === 'Present' || attendance.status === 'present' || attendance.isActive);
      const isLate = attendance?.checkInTime ? isLateArrival(attendance.checkInTime) : false;
      
      return {
        ...empObj,
        attendanceStatus: isPresent ? 'active' : 'inactive',
        attendanceToday: attendance ? {
          ...attendance.toObject(),
          status: attendance.status || 'Present',
          isLate
        } : null,
        isCheckedIn: attendance ? attendance.isActive : false,
        checkInTime: attendance ? attendance.checkInTime : null,
        checkOutTime: attendance ? attendance.checkOutTime : null,
        isLate
      };
    });

    const presentCount = employeesWithAttendance.filter(e => e.attendanceToday && (e.attendanceToday.status === 'Present' || e.attendanceToday.status === 'present')).length;
    const lateCount = employeesWithAttendance.filter(e => e.isLate).length;
    const activeCount = employeesWithAttendance.filter(e => e.isCheckedIn).length;

    res.json({
      success: true,
      count: employeesWithAttendance.length,
      presentCount,
      lateCount,
      activeCount,
      inactiveCount: employeesWithAttendance.length - activeCount,
      data: employeesWithAttendance
    });
  } catch (error) {
    console.error('Get today all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get today's attendance status for all employees (for admin) or own data (for employee)
// @route   GET /api/attendance/today-status
// @access  Private
const getTodayAttendanceStatus = async (req, res) => {
  try {
    const { start: today, end: tomorrow } = getTodayDateRange();

    // All logged-in users see all employees
    const employees = await Employee.find().sort({ createdAt: -1 });

    // Get today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    // Map attendance to employees by employeeId, userId, and email
    const attendanceByEmpId = {};
    const attendanceByUserId = {};
    const attendanceByEmail = {};

    attendances.forEach(att => {
      const empIdStr = att.employeeId?._id ? att.employeeId._id.toString() : (att.employeeId ? att.employeeId.toString() : null);
      if (empIdStr) attendanceByEmpId[empIdStr] = att;
      if (att.userId) attendanceByUserId[att.userId.toString()] = att;
      if (att.employeeId?.email) {
        attendanceByEmail[att.employeeId.email.toLowerCase().trim()] = att;
      }
    });

    // Create response with active/inactive status
    const employeesWithStatus = employees.map(emp => {
      const empObj = emp.toObject();
      const empEmail = emp.email ? emp.email.toLowerCase().trim() : '';
      const attendance = attendanceByEmpId[emp._id.toString()] ||
                         attendanceByUserId[emp._id.toString()] ||
                         (emp.userId ? attendanceByUserId[emp.userId.toString()] : null) ||
                         attendanceByEmail[empEmail];

      const isPresent = attendance && (attendance.status === 'Present' || attendance.status === 'present' || attendance.isActive);
      const isLate = attendance?.checkInTime ? isLateArrival(attendance.checkInTime) : false;
      
      let status = 'inactive';
      if (attendance) {
        status = attendance.isActive ? 'active' : 'inactive';
      }
      
      return {
        ...empObj,
        attendanceStatus: status,
        attendanceToday: attendance ? {
          ...attendance.toObject(),
          status: attendance.status || 'Present',
          isLate
        } : null,
        isCheckedIn: attendance ? attendance.isActive : false,
        checkInTime: attendance ? attendance.checkInTime : null,
        checkOutTime: attendance ? attendance.checkOutTime : null,
        isLate
      };
    });

    const presentCount = employeesWithStatus.filter(e => e.attendanceToday && (e.attendanceToday.status === 'Present' || e.attendanceToday.status === 'present')).length;
    const lateCount = employeesWithStatus.filter(e => e.isLate).length;
    const activeCount = employeesWithStatus.filter(e => e.attendanceStatus === 'active').length;

    res.json({
      success: true,
      count: employeesWithStatus.length,
      presentCount,
      lateCount,
      activeCount,
      inactiveCount: employeesWithStatus.length - activeCount,
      data: employeesWithStatus
    });
  } catch (error) {
    console.error('Get today attendance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
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

    console.log('🔍 [Attendance Flow] GET /api/attendance/history for ID:', employeeId);

    const emp = mongoose.isValidObjectId(employeeId) ? await Employee.findById(employeeId) : null;
    const usr = mongoose.isValidObjectId(employeeId) ? await User.findById(employeeId) : null;

    const idFilters = [{ employeeId: employeeId }, { userId: employeeId }];
    if (emp) {
      idFilters.push({ employeeId: emp._id });
      const matchingUser = await User.findOne({ email: new RegExp(`^${emp.email.trim()}$`, 'i') });
      if (matchingUser) idFilters.push({ userId: matchingUser._id });
    }
    if (usr) {
      idFilters.push({ userId: usr._id });
      const matchingEmp = await Employee.findOne({ email: new RegExp(`^${usr.email.trim()}$`, 'i') });
      if (matchingEmp) idFilters.push({ employeeId: matchingEmp._id });
    }

    let query = { $or: idFilters };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employeeId', 'name email employeeId designation');

    res.json({
      success: true,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Admin mark attendance for any employee
// @route   POST /api/attendance/admin-mark
// @access  Admin only
const adminMarkAttendance = async (req, res) => {
  try {
    const { employeeId, status = 'Present', notes = '' } = req.body;
    const adminUserId = req.user?.id || req.user?.userId;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
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

    const matchingUser = await User.findOne({ email: new RegExp(`^${employee.email.trim()}$`, 'i') });
    const finalUserId = matchingUser?._id || adminUserId;

    // Check if attendance already marked for today
    const { start: today, end: tomorrow } = getTodayDateRange();

    const existingAttendance = await Attendance.findOne({
      $or: [{ employeeId: employee._id }, { userId: finalUserId }],
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
      userId: finalUserId,
      date: new Date(),
      status,
      checkInTime: new Date(),
      isActive: true,
      notes: notes || `Marked by admin: ${req.user?.email || 'Admin'}`
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    await broadcastAttendanceUpdate(req, populatedAttendance, employee, 'admin_marked');

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${employee.name}`,
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Admin mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
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
    
    let startSearch, endSearch;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const parts = date.split('T')[0].split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);

      const startLocal = new Date(y, m, d, 0, 0, 0, 0);
      const endLocal = new Date(y, m, d + 1, 0, 0, 0, 0);
      const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      const endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));

      startSearch = new Date(Math.min(startLocal.getTime(), startUtc.getTime()));
      endSearch = new Date(Math.max(endLocal.getTime(), endUtc.getTime()));
    } else {
      const d = new Date(date);
      startSearch = new Date(d);
      startSearch.setHours(0, 0, 0, 0);
      endSearch = new Date(startSearch);
      endSearch.setDate(endSearch.getDate() + 1);
    }
    
    console.log('=== Get Attendance By Date ===');
    console.log('Search date window:', { startSearch, endSearch });
    
    // Get all employees
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    // Get attendance records for selected date
    const attendances = await Attendance.find({
      date: { $gte: startSearch, $lt: endSearch }
    }).populate('employeeId', 'name email employeeId designation');
    
    console.log('Found attendances:', attendances.length);
    
    // Map attendance to employees by empId, userId, and email
    const attendanceByEmpId = {};
    const attendanceByUserId = {};
    const attendanceByEmail = {};

    attendances.forEach(att => {
      const empIdStr = att.employeeId?._id ? att.employeeId._id.toString() : (att.employeeId ? att.employeeId.toString() : null);
      if (empIdStr) attendanceByEmpId[empIdStr] = att;
      if (att.userId) attendanceByUserId[att.userId.toString()] = att;
      if (att.employeeId?.email) {
        attendanceByEmail[att.employeeId.email.toLowerCase().trim()] = att;
      }
    });
    
    // Create response with attendance status
    const employeesWithAttendance = employees.map(emp => {
      const empObj = emp.toObject();
      const empEmail = emp.email ? emp.email.toLowerCase().trim() : '';
      const attendance = attendanceByEmpId[emp._id.toString()] ||
                         attendanceByUserId[emp._id.toString()] ||
                         (emp.userId ? attendanceByUserId[emp.userId.toString()] : null) ||
                         attendanceByEmail[empEmail];
      
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
    const presentCount = attendances.filter(a => a.status === 'Present' || a.status === 'present').length;
    const absentCount = Math.max(0, employees.length - presentCount);
    const onLeaveCount = attendances.filter(a => a.status === 'Leave' || a.status === 'leave').length;
    
    res.json({
      success: true,
      date: date,
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
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get attendance stats (present/absent count for today)
// @route   GET /api/attendance/stats
// @access  Private (All authenticated users)
const getAttendanceStats = async (req, res) => {
  try {
    const { start: today, end: tomorrow } = getTodayDateRange();

    // Get all active employees count
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });

    // Get today's attendance records with populated fields
    const todayAttendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    const presentCount = todayAttendances.filter(a => a.status === 'Present').length;
    const onLeaveCount = todayAttendances.filter(a => a.status === 'Leave').length;
    const lateCount = todayAttendances.filter(a => a.checkInTime && isLateArrival(a.checkInTime)).length;
    const activeNowCount = todayAttendances.filter(a => a.isActive).length;
    const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

    console.log('=== Attendance Stats Synchronized ===', {
      total: totalEmployees,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      onLeave: onLeaveCount,
      activeNow: activeNowCount
    });

    res.json({
      success: true,
      date: today,
      total: totalEmployees,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      lateArrival: lateCount,
      onLeave: onLeaveCount,
      activeNow: activeNowCount
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
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

      // Note: Legacy new_leave_request event removed to avoid duplicate notifications.
      // The newNotification event above already delivers the leave notification to admins.
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

      // Note: Legacy leave_status_updated event removed to avoid duplicate notifications.
      // The newNotification event above already delivers the leave status to the employee.
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

// Haversine formula for Geo-distance in meters
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

// Default Office Coordinates & Radius (Configurable)
const OFFICE_LOCATION = {
  name: 'AttendancePro HQ Campus',
  latitude: parseFloat(process.env.OFFICE_LAT || '28.6139'),
  longitude: parseFloat(process.env.OFFICE_LNG || '77.2090'),
  radiusMeters: parseInt(process.env.OFFICE_RADIUS || '1000', 10)
};

// @desc    Get Office Geolocation & Verification Settings
// @route   GET /api/attendance/office-location
// @access  Private
const getOfficeLocation = async (req, res) => {
  try {
    res.json({
      success: true,
      data: OFFICE_LOCATION
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch office location' });
  }
};

// @desc    Generate a dynamic live QR token for Office Display / Kiosk
// @route   GET /api/attendance/qr-token
// @access  Private
const getLiveQRToken = async (req, res) => {
  try {
    const timestamp = Date.now();
    // Rolling token valid for window
    const token = `ATT_QR_${Buffer.from(`${timestamp}_${Math.random().toString(36).substring(2, 9)}`).toString('base64')}`;
    
    res.json({
      success: true,
      data: {
        token,
        timestamp,
        expiresInSeconds: 45,
        office: OFFICE_LOCATION.name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR token' });
  }
};

// @desc    Mark attendance using Verified QR code and/or GPS Geolocation
// @route   POST /api/attendance/mark-verified
// @access  Private (Employee)
const markAttendanceVerified = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status = 'Present', notes = '', verificationMethod = 'geolocation', qrToken, location } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employee = await Employee.findOne({ email: new RegExp(`^${user.email.trim()}$`, 'i') });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found'
      });
    }

    // Check if attendance already marked today
    const { start: today, end: tomorrow } = getTodayDateRange();

    const existingAttendance = await Attendance.findOne({
      $or: [{ employeeId: employee._id }, { userId: user._id }],
      date: { $gte: today, $lt: tomorrow }
    }).populate('employeeId', 'name email employeeId designation');

    if (existingAttendance) {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: 'Attendance already marked for today',
        data: existingAttendance,
        checkInTime: existingAttendance.checkInTime,
        status: existingAttendance.status
      });
    }

    // Process Geolocation distance if coordinates provided
    let distanceInMeters = null;
    let isWithinOfficeRadius = false;

    if (location && location.latitude && location.longitude) {
      distanceInMeters = calculateDistanceInMeters(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );
      isWithinOfficeRadius = distanceInMeters <= OFFICE_LOCATION.radiusMeters;
    }

    const checkInDate = new Date();
    const isLate = isLateArrival(checkInDate);

    // Create verified attendance record
    const attendance = await Attendance.create({
      employeeId: employee._id,
      userId: user._id,
      date: new Date(),
      status,
      checkInTime: checkInDate,
      isActive: true,
      notes: notes || (isLate ? 'Verified Check-in (Late Arrival)' : 'Verified Check-in'),
      verificationMethod,
      qrToken: qrToken || null,
      location: {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accuracy: location?.accuracy || null,
        address: location?.address || (isWithinOfficeRadius ? 'Verified at Office Campus' : 'Remote / GPS Recorded'),
        distanceInMeters,
        isWithinOfficeRadius
      }
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    // Create rich notification for admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    const methodLabel = verificationMethod === 'qr_code' 
      ? '📱 QR Code' 
      : verificationMethod === 'geolocation' 
      ? '📍 GPS Location' 
      : (verificationMethod === 'face_recognition' || verificationMethod === 'face_lock') 
      ? '👤 AI Face Lock' 
      : '✓ Verified';
    
    for (const admin of admins) {
      await Notification.create({
        type: 'attendance',
        title: `Attendance Marked via ${methodLabel}`,
        message: `${employee.name} checked in via ${methodLabel} (${isWithinOfficeRadius ? 'Inside Office Zone' : (distanceInMeters ? `${distanceInMeters}m away` : 'Remote')}) at ${checkInDate.toLocaleTimeString()} (${isLate ? 'Late Arrival' : 'On Time'})`,
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        senderId: user._id,
        receiverId: admin._id
      });
    }

    // Broadcast realtime update
    await broadcastAttendanceUpdate(req, populatedAttendance, employee, 'verified_marked');

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully via ${methodLabel}! (${isLate ? 'Late Arrival' : 'On Time'})`,
      data: populatedAttendance,
      isLate,
      checkInTime: populatedAttendance.checkInTime,
      status: populatedAttendance.status
    });
  } catch (error) {
    console.error('Mark verified attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while marking verified attendance'
    });
  }
};

// @desc    Mark attendance via Face Recognition / Face Lock Scanner (Device / Kiosk / App / Web)
// @route   POST /api/attendance/face-recognition OR POST /api/attendance/face-mark
// @access  Public (Device with Employee Info) OR Private (Employee session)
const markFaceRecognitionAttendance = async (req, res) => {
  try {
    console.log('----------------------------------------------------');
    console.log('🤖 [Face Recognition Flow] Step 1: Received Face Attendance Request');
    console.log('Request Headers Authorization:', req.headers.authorization ? 'Bearer provided' : 'None');
    console.log('Request Body:', req.body);

    const {
      employeeId: bodyEmployeeId,
      userId: bodyUserId,
      email: bodyEmail,
      status = 'Present',
      notes = '',
      location = null,
      verificationMethod = 'face_recognition',
      checkInTime = new Date()
    } = req.body;

    let targetUserId = req.user ? (req.user.id || req.user.userId) : bodyUserId;
    let employee = null;
    let user = null;

    // Resolve user & employee
    if (targetUserId) {
      user = await User.findById(targetUserId);
    }
    
    if (bodyEmail) {
      const emailRegex = new RegExp(`^${bodyEmail.trim()}$`, 'i');
      if (!user) user = await User.findOne({ email: emailRegex });
      if (!employee) employee = await Employee.findOne({ email: emailRegex });
    }

    if (bodyEmployeeId && !employee) {
      if (typeof bodyEmployeeId === 'string' && bodyEmployeeId.match(/^[0-9a-fA-F]{24}$/)) {
        employee = await Employee.findById(bodyEmployeeId);
      }
      if (!employee) {
        employee = await Employee.findOne({ employeeId: bodyEmployeeId });
      }
    }

    if (user && !employee) {
      employee = await Employee.findOne({ email: new RegExp(`^${user.email.trim()}$`, 'i') });
    }

    if (employee && !user) {
      user = await User.findOne({ email: new RegExp(`^${employee.email.trim()}$`, 'i') });
    }

    console.log('🤖 [Face Recognition Flow] Step 2: Employee/User Resolved:', {
      employee: employee ? `${employee.name} (${employee._id})` : 'NOT FOUND',
      user: user ? `${user.name} (${user._id})` : 'NOT FOUND'
    });

    if (!employee && !user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for face recognition match. Please check Employee ID or Email.'
      });
    }

    const resolvedEmployeeId = employee ? employee._id : null;
    const resolvedUserId = user ? user._id : (employee ? employee._id : targetUserId);

    // Duplicate check for today
    const { start: todayStart, end: todayEnd } = getTodayDateRange();

    const idFilters = [];
    if (resolvedEmployeeId) idFilters.push({ employeeId: resolvedEmployeeId });
    if (resolvedUserId) idFilters.push({ userId: resolvedUserId });
    
    const existingAttendance = await Attendance.findOne({
      $and: [
        { date: { $gte: todayStart, $lt: todayEnd } },
        { $or: idFilters }
      ]
    }).populate('employeeId', 'name email employeeId designation');

    if (existingAttendance) {
      console.log('⚠️ [Face Recognition Flow] Duplicate Check: Attendance already exists for today:', existingAttendance._id);
      
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `Attendance already recorded for ${employee?.name || user?.name || 'Employee'} today.`,
        data: existingAttendance,
        checkInTime: existingAttendance.checkInTime,
        checkOutTime: existingAttendance.checkOutTime,
        status: existingAttendance.status,
        isLate: existingAttendance.checkInTime ? isLateArrival(existingAttendance.checkInTime) : false
      });
    }

    // Step 3: Save to Database
    const effectiveCheckInTime = new Date(checkInTime || Date.now());
    const isLate = isLateArrival(effectiveCheckInTime);

    const attendance = await Attendance.create({
      employeeId: resolvedEmployeeId || resolvedUserId,
      userId: resolvedUserId,
      date: new Date(),
      status: status || 'Present',
      checkInTime: effectiveCheckInTime,
      isActive: true,
      notes: notes || (isLate ? 'Verified via AI Face Recognition (Late Arrival)' : 'Verified via AI Face Recognition Scanner'),
      verificationMethod: verificationMethod || 'face_recognition',
      location: {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accuracy: location?.accuracy || null,
        address: location?.address || 'AI Face Recognition Device Capture',
        isWithinOfficeRadius: true
      }
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    console.log('✅ [Face Recognition Flow] Step 3: Saved successfully in database with ID:', attendance._id);

    // Step 4: Admin Notifications & Alerts
    const admins = await User.find({ role: 'admin' }).select('_id');
    const empName = employee?.name || user?.name || 'Employee';
    const empEmail = employee?.email || user?.email || '';

    for (const admin of admins) {
      await Notification.create({
        type: 'attendance',
        title: '👤 AI Face Recognition Attendance',
        message: `${empName} (${empEmail}) verified and marked attendance via Face Recognition Scanner at ${effectiveCheckInTime.toLocaleTimeString()} (${isLate ? 'Late Arrival' : 'On Time'})`,
        employeeId: resolvedEmployeeId,
        employeeName: empName,
        employeeEmail: empEmail,
        senderId: resolvedUserId,
        receiverId: admin._id
      });
    }

    // Step 5: Broadcast Real-time event across Mobile & Web
    console.log('📡 [Face Recognition Flow] Step 4 & 5: Broadcasting Realtime Synchronization...');
    await broadcastAttendanceUpdate(req, populatedAttendance, employee || user, 'face_recognition_marked');

    return res.status(201).json({
      success: true,
      message: `👤 Face Recognition Matched! Attendance marked for ${empName} (${isLate ? 'Late Arrival' : 'On Time'}).`,
      data: populatedAttendance,
      isLate,
      checkInTime: populatedAttendance.checkInTime,
      status: populatedAttendance.status
    });
  } catch (error) {
    console.error('❌ [Face Recognition Flow] Error marking face recognition attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error marking face recognition attendance: ' + error.message
    });
  }
};

// @desc    Admin update attendance record (edit time, status, notes)
// @route   PUT /api/attendance/:id
// @access  Admin only
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, notes, isActive } = req.body;

    const attendance = await Attendance.findById(id).populate('employeeId', 'name email employeeId');
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    if (isActive !== undefined) attendance.isActive = isActive;

    if (checkInTime) {
      attendance.checkInTime = new Date(checkInTime);
    }

    if (checkOutTime) {
      attendance.checkOutTime = new Date(checkOutTime);
      attendance.isActive = false;
    } else if (checkOutTime === null) {
      attendance.checkOutTime = null;
      attendance.isActive = true;
    }

    // Recalculate work hours if both times exist
    if (attendance.checkInTime && attendance.checkOutTime) {
      const diffMs = Math.max(0, new Date(attendance.checkOutTime) - new Date(attendance.checkInTime));
      const hours = diffMs / (1000 * 60 * 60);
      attendance.workHours = parseFloat(hours.toFixed(2));
    }

    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email employeeId designation');

    await broadcastAttendanceUpdate(req, populated, populated.employeeId, 'updated');

    res.json({
      success: true,
      message: 'Attendance record and time updated successfully',
      data: populated
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating attendance'
    });
  }
};

module.exports = {
  markAttendance,
  markAttendanceVerified,
  markFaceRecognitionAttendance,
  getLiveQRToken,
  getOfficeLocation,
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
  getAttendanceByDate,
  updateAttendance
};
