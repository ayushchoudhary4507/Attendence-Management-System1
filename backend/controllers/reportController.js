const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const ShiftAssignment = require('../models/ShiftAssignment');

// Generate monthly report for a specific employee
const getMonthlyReport = async (req, res) => {
  try {
    // Employees can only see their own report; admins can specify any userId
    let userId = req.params.userId || req.userId;
    if (req.user.role !== 'admin' && req.params.userId && req.params.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // For /my-report route (no params), always use logged-in user's ID
    if (!req.params.userId) {
      userId = req.userId;
    }

    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required query parameters' });
    }

    const m = Number(month);
    const y = Number(year);

    // Find employee by userId
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Get attendance data
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalPresent = attendanceRecords.filter(a => a.status === 'Present').length;
    const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
    const totalAbsent = attendanceRecords.filter(a => a.status === 'Absent').length;
    const totalLeave = attendanceRecords.filter(a => a.status === 'Leave').length;
    const totalWorkingHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
    
    const lateCount = attendanceRecords.filter(a => {
      if (a.checkInTime) {
        const checkIn = new Date(a.checkInTime);
        return checkIn.getHours() >= 10 && checkIn.getMinutes() > 0;
      }
      return false;
    }).length;

    // Get salary data
    const salary = await Salary.findOne({ employeeId: employee._id, month: m, year: y });

    // Get shift assignments
    const shiftAssignments = await ShiftAssignment.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('shiftId');

    const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

    const report = {
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      designation: employee.designation,
      month: m,
      year: y,
      monthName,
      attendance: {
        totalPresent,
        halfDays,
        totalAbsent,
        totalLeave,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        lateCount
      },
      salary: salary ? {
        basicSalary: salary.basicSalary,
        perDaySalary: salary.perDaySalary,
        totalPresentDays: salary.totalPresentDays,
        deductions: salary.deductions,
        bonus: salary.bonus,
        overtimePay: salary.overtimePay,
        finalSalary: salary.finalSalary,
        isPaid: salary.isPaid,
        paidOn: salary.paidOn
      } : null,
      shifts: shiftAssignments.map(sa => ({
        date: sa.date,
        shift: sa.shiftId ? {
          name: sa.shiftId.shiftName,
          startTime: sa.shiftId.startTime,
          endTime: sa.shiftId.endTime
        } : null
      }))
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Generate monthly report for all employees (Admin view)
const getAllMonthlyReports = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required query parameters' });
    }

    const m = Number(month);
    const y = Number(year);

    const employees = await Employee.find({ status: 'Active' });
    const reports = [];

    for (const employee of employees) {
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);

      const attendanceRecords = await Attendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const totalPresent = attendanceRecords.filter(a => a.status === 'Present').length;
      const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
      const totalAbsent = attendanceRecords.filter(a => a.status === 'Absent').length;
      const totalLeave = attendanceRecords.filter(a => a.status === 'Leave').length;
      const totalWorkingHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
      
      const lateCount = attendanceRecords.filter(a => {
        if (a.checkInTime) {
          const checkIn = new Date(a.checkInTime);
          return checkIn.getHours() >= 10 && checkIn.getMinutes() > 0;
        }
        return false;
      }).length;

      const salary = await Salary.findOne({ employeeId: employee._id, month: m, year: y });

      const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

      reports.push({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        designation: employee.designation,
        month: m,
        year: y,
        monthName,
        attendance: {
          totalPresent,
          halfDays,
          totalAbsent,
          totalLeave,
          totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
          lateCount
        },
        salary: salary ? {
          basicSalary: salary.basicSalary,
          finalSalary: salary.finalSalary,
          deductions: salary.deductions,
          isPaid: salary.isPaid
        } : null
      });
    }

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error generating all monthly reports:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMonthlyReport,
  getAllMonthlyReports
};
