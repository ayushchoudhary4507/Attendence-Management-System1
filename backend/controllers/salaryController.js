const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');

// Calculate salary for an employee for a specific month/year
const calculateSalary = async (req, res) => {
  try {
    const { employeeId, month, year, basicSalary, perDaySalary, perHourSalary, deductions, bonus, overtimePay, notes } = req.body;

    if (!employeeId || !month || !year || !basicSalary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID, month, year, and basic salary are required' 
      });
    }

    // Find employee and corresponding user
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const User = require('../models/User');
    const user = await User.findOne({ email: employee.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found for this employee' });
    }

    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate attendance metrics
    const totalPresentDays = attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Half Day').length;
    const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
    const effectivePresentDays = totalPresentDays - (halfDays * 0.5);
    const totalAbsentDays = attendanceRecords.filter(a => a.status === 'Absent').length;
    const totalWorkingHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
    
    // Late count: check-ins after 10 AM
    const lateCount = attendanceRecords.filter(a => {
      if (a.checkInTime) {
        const checkIn = new Date(a.checkInTime);
        return checkIn.getHours() >= 10 && checkIn.getMinutes() > 0;
      }
      return false;
    }).length;

    // Calculate per-day and per-hour salary if not provided
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const calculatedPerDay = perDaySalary || (basicSalary / totalDaysInMonth);
    const calculatedPerHour = perHourSalary || (basicSalary / (totalDaysInMonth * 8));

    // Calculate final salary
    const attendanceBasedSalary = calculatedPerDay * effectivePresentDays;
    const hoursBasedSalary = calculatedPerHour * totalWorkingHours;
    
    // Use the higher of the two salary calculations, or attendance-based if both available
    let baseSalary;
    if (perDaySalary && perHourSalary) {
      baseSalary = attendanceBasedSalary; // prefer per-day when both specified
    } else if (perDaySalary) {
      baseSalary = attendanceBasedSalary;
    } else if (perHourSalary) {
      baseSalary = hoursBasedSalary;
    } else {
      baseSalary = attendanceBasedSalary;
    }

    const totalDeductions = deductions || 0;
    const totalBonus = bonus || 0;
    const totalOvertimePay = overtimePay || 0;
    const finalSalary = Math.max(0, baseSalary - totalDeductions + totalBonus + totalOvertimePay);

    // Upsert salary record
    const salary = await Salary.findOneAndUpdate(
      { employeeId, month, year },
      {
        userId: user._id,
        basicSalary,
        perDaySalary: calculatedPerDay,
        perHourSalary: calculatedPerHour,
        totalPresentDays: effectivePresentDays,
        totalAbsentDays,
        totalWorkingHours,
        lateCount,
        deductions: totalDeductions,
        bonus: totalBonus,
        overtimePay: totalOvertimePay,
        finalSalary,
        calculatedBy: req.userId,
        notes: notes || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send notification to employee
    try {
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      const salaryMsg = `Your salary for ${monthName} ${year} has been calculated. Final salary: ₹${finalSalary.toLocaleString()}`;
      
      const notification = await Notification.create({
        type: 'salary_generated',
        title: 'Salary Generated',
        message: salaryMsg,
        receiverId: user._id,
        senderId: req.userId,
        senderName: req.user?.name || 'Admin',
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        link: '/salary',
        read: false
      });

      // Emit via Socket.IO
      const io = global._io;
      if (io) {
        const onlineUsersMap = io.onlineUsers;
        const targetUser = onlineUsersMap ? onlineUsersMap.get(user._id.toString()) : null;
        if (targetUser && targetUser.isOnline) {
          io.to(targetUser.socketId).emit('newNotification', {
            id: notification._id,
            type: 'salary_generated',
            title: 'Salary Generated',
            message: salaryMsg,
            senderId: req.userId,
            senderName: req.user?.name || 'Admin',
            receiverId: user._id,
            link: '/salary',
            createdAt: notification.createdAt,
            read: false
          });
          console.log(`📢 Salary notification sent to user ${user._id}`);
        }
      }
    } catch (notifError) {
      console.error('Failed to send salary notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Salary calculated successfully',
      data: salary
    });
  } catch (error) {
    console.error('Error calculating salary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get salary for a specific user (Employee view)
const getUserSalary = async (req, res) => {
  try {
    // Employees can only see their own salary; admins can specify any userId
    let userId = req.params.userId || req.userId;
    if (req.user.role !== 'admin' && req.params.userId && req.params.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // For /my-salary route (no params), always use logged-in user's ID
    if (!req.params.userId) {
      userId = req.userId;
    }

    const { month, year } = req.query;

    let query = { userId };
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name email designation')
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all salaries (Admin view)
const getAllSalaries = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;

    let query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (employeeId) query.employeeId = employeeId;

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name email designation')
      .populate('userId', 'name email')
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Mark salary as paid
const markAsPaid = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(
      req.params.id,
      { isPaid: true, paidOn: new Date() },
      { new: true }
    );
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }
    res.json({ success: true, message: 'Salary marked as paid', data: salary });
  } catch (error) {
    console.error('Error marking salary as paid:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Bulk calculate salary for all employees (Admin / Cron job)
const bulkCalculateSalary = async (month, year, calculatedByUserId) => {
  try {
    const employees = await Employee.find({ status: 'Active' });
    const results = [];

    for (const employee of employees) {
      const User = require('../models/User');
      const user = await User.findOne({ email: employee.email });
      if (!user) continue;

      // Check if salary already calculated
      const existingSalary = await Salary.findOne({ employeeId: employee._id, month, year });
      if (existingSalary) {
        results.push({ employeeId: employee._id, name: employee.name, status: 'already_exists' });
        continue;
      }

      // Get attendance data
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const attendanceRecords = await Attendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const totalPresentDays = attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Half Day').length;
      const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
      const effectivePresentDays = totalPresentDays - (halfDays * 0.5);
      const totalAbsentDays = attendanceRecords.filter(a => a.status === 'Absent').length;
      const totalWorkingHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
      
      const lateCount = attendanceRecords.filter(a => {
        if (a.checkInTime) {
          const checkIn = new Date(a.checkInTime);
          return checkIn.getHours() >= 10 && checkIn.getMinutes() > 0;
        }
        return false;
      }).length;

      // Default basic salary if not set
      const basicSalary = 20000; // Default - can be configured per employee
      const totalDaysInMonth = new Date(year, month, 0).getDate();
      const perDaySalary = basicSalary / totalDaysInMonth;
      const finalSalary = perDaySalary * effectivePresentDays;

      const salary = await Salary.create({
        employeeId: employee._id,
        userId: user._id,
        month,
        year,
        basicSalary,
        perDaySalary,
        totalPresentDays: effectivePresentDays,
        totalAbsentDays,
        totalWorkingHours,
        lateCount,
        deductions: 0,
        finalSalary,
        calculatedBy: calculatedByUserId,
        notes: 'Auto-calculated by system'
      });

      // Send notification
      try {
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        const salaryMsg = `Your salary for ${monthName} ${year} has been auto-calculated. Final salary: ₹${finalSalary.toLocaleString()}`;
        
        const notification = await Notification.create({
          type: 'salary_generated',
          title: 'Salary Auto-Generated',
          message: salaryMsg,
          receiverId: user._id,
          employeeId: employee._id,
          employeeName: employee.name,
          employeeEmail: employee.email,
          link: '/salary',
          read: false
        });

        const io = global._io;
        if (io) {
          const onlineUsersMap = io.onlineUsers;
          const targetUser = onlineUsersMap ? onlineUsersMap.get(user._id.toString()) : null;
          if (targetUser && targetUser.isOnline) {
            io.to(targetUser.socketId).emit('newNotification', {
              id: notification._id,
              type: 'salary_generated',
              title: 'Salary Auto-Generated',
              message: salaryMsg,
              receiverId: user._id,
              link: '/salary',
              createdAt: notification.createdAt,
              read: false
            });
          }
        }
      } catch (notifError) {
        console.error('Failed to send salary notification:', notifError.message);
      }

      results.push({ employeeId: employee._id, name: employee.name, status: 'calculated', finalSalary });
    }

    return results;
  } catch (error) {
    console.error('Error in bulk salary calculation:', error);
    throw error;
  }
};

// Trigger bulk calculation via API (Admin only)
const triggerBulkCalculation = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const results = await bulkCalculateSalary(month, year, req.userId);

    res.json({
      success: true,
      message: `Salary calculated for ${results.length} employees`,
      data: results
    });
  } catch (error) {
    console.error('Error triggering bulk calculation:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  calculateSalary,
  getUserSalary,
  getAllSalaries,
  markAsPaid,
  bulkCalculateSalary,
  triggerBulkCalculation
};
