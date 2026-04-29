const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const ShiftAssignment = require('../models/ShiftAssignment');
const XLSX = require('xlsx');

// Daily attendance report
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const employees = await Employee.find({ status: 'Active' });
    const records = await Attendance.find({
      date: { $gte: reportDate, $lt: nextDay }
    }).populate('employeeId', 'name email designation employeeId');

    const totalEmployees = employees.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const halfDay = records.filter(r => r.status === 'Half Day').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const notMarked = totalEmployees - records.length;

    res.json({
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        summary: { totalEmployees, present, absent, halfDay, leave, notMarked },
        records: records.map(r => ({
          employeeId: r.employeeId?.employeeId || '-',
          name: r.employeeId?.name || '-',
          email: r.employeeId?.email || '-',
          designation: r.employeeId?.designation || '-',
          status: r.status,
          checkIn: r.checkInTime,
          checkOut: r.checkOutTime,
          workHours: r.workHours || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Weekly attendance report
const getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    const weekStart = startDate ? new Date(startDate) : getMonday(new Date());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const employees = await Employee.find({ status: 'Active' });
    const records = await Attendance.find({
      date: { $gte: weekStart, $lt: weekEnd }
    }).populate('employeeId', 'name email designation employeeId');

    // Group by day
    const dailyData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayRecords = records.filter(r => {
        const rDate = new Date(r.date);
        return rDate >= day && rDate < nextDay;
      });
      dailyData.push({
        date: day.toISOString().split('T')[0],
        dayName: day.toLocaleDateString('en-US', { weekday: 'long' }),
        present: dayRecords.filter(r => r.status === 'Present').length,
        absent: dayRecords.filter(r => r.status === 'Absent').length,
        halfDay: dayRecords.filter(r => r.status === 'Half Day').length,
        leave: dayRecords.filter(r => r.status === 'Leave').length
      });
    }

    // Per-employee summary
    const employeeSummary = employees.map(emp => {
      const empRecords = records.filter(r => r.employeeId?._id?.toString() === emp._id.toString());
      return {
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.designation,
        present: empRecords.filter(r => r.status === 'Present').length,
        absent: empRecords.filter(r => r.status === 'Absent').length,
        halfDay: empRecords.filter(r => r.status === 'Half Day').length,
        leave: empRecords.filter(r => r.status === 'Leave').length,
        totalHours: empRecords.reduce((sum, r) => sum + (r.workHours || 0), 0)
      };
    });

    res.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: new Date(weekEnd.getTime() - 86400000).toISOString().split('T')[0],
        dailyData,
        employeeSummary
      }
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Monthly attendance report with charts data
const getMonthlyReportCharts = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year ? Number(year) : new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);
    const daysInMonth = new Date(y, m, 0).getDate();

    const employees = await Employee.find({ status: 'Active' });
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('employeeId', 'name email designation employeeId');

    // Daily breakdown for bar chart
    const dailyBreakdown = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(y, m - 1, d);
      const nextDay = new Date(y, m - 1, d + 1);
      const dayRecords = records.filter(r => {
        const rDate = new Date(r.date);
        return rDate >= dayDate && rDate < nextDay;
      });
      dailyBreakdown.push({
        date: d,
        label: `${d}`,
        present: dayRecords.filter(r => r.status === 'Present').length,
        absent: dayRecords.filter(r => r.status === 'Absent').length,
        halfDay: dayRecords.filter(r => r.status === 'Half Day').length,
        leave: dayRecords.filter(r => r.status === 'Leave').length
      });
    }

    // Pie chart data
    const totalPresent = records.filter(r => r.status === 'Present').length;
    const totalAbsent = records.filter(r => r.status === 'Absent').length;
    const totalHalfDay = records.filter(r => r.status === 'Half Day').length;
    const totalLeave = records.filter(r => r.status === 'Leave').length;

    // Employee-wise summary
    const employeeSummary = employees.map(emp => {
      const empRecords = records.filter(r => r.employeeId?._id?.toString() === emp._id.toString());
      return {
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.designation,
        present: empRecords.filter(r => r.status === 'Present').length,
        absent: empRecords.filter(r => r.status === 'Absent').length,
        halfDay: empRecords.filter(r => r.status === 'Half Day').length,
        leave: empRecords.filter(r => r.status === 'Leave').length,
        totalHours: Math.round(empRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) * 100) / 100
      };
    });

    const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

    res.json({
      success: true,
      data: {
        month: m,
        year: y,
        monthName,
        totalEmployees: employees.length,
        pieData: { present: totalPresent, absent: totalAbsent, halfDay: totalHalfDay, leave: totalLeave },
        dailyBreakdown,
        employeeSummary
      }
    });
  } catch (error) {
    console.error('Error generating monthly chart report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Export attendance data to Excel
const exportAttendanceExcel = async (req, res) => {
  try {
    const { month, year, startDate, endDate, employeeId } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month && year) {
      const m = Number(month);
      const y = Number(year);
      query.date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query)
      .populate('employeeId', 'name email designation employeeId')
      .sort({ date: 1 });

    const data = records.map(r => ({
      'Employee ID': r.employeeId?.employeeId || '-',
      'Employee Name': r.employeeId?.name || '-',
      'Email': r.employeeId?.email || '-',
      'Designation': r.employeeId?.designation || '-',
      'Date': new Date(r.date).toLocaleDateString('en-IN'),
      'Status': r.status,
      'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN') : '-',
      'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN') : '-',
      'Work Hours': r.workHours || 0,
      'Notes': r.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 18 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `attendance_${month || 'all'}_${year || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Export salary data to Excel
const exportSalaryExcel = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name email designation employeeId')
      .sort({ year: -1, month: -1 });

    const data = salaries.map(s => ({
      'Employee ID': s.employeeId?.employeeId || '-',
      'Employee Name': s.employeeId?.name || '-',
      'Email': s.employeeId?.email || '-',
      'Designation': s.employeeId?.designation || '-',
      'Month': new Date(s.year, s.month - 1).toLocaleString('default', { month: 'long' }),
      'Year': s.year,
      'Basic Salary': s.basicSalary,
      'Per Day Salary': s.perDaySalary,
      'Present Days': s.totalPresentDays,
      'Absent Deductions': s.deductions?.absentDeductions || 0,
      'Late Deductions': s.deductions?.lateDeductions || 0,
      'Other Deductions': s.deductions?.otherDeductions || 0,
      'Bonus': s.bonus || 0,
      'Overtime Pay': s.overtimePay || 0,
      'Final Salary': s.finalSalary,
      'Payment Status': s.isPaid ? 'Paid' : 'Pending'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 18 },
      { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Salary');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `salary_${month || 'all'}_${year || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting salary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Helper: get Monday of current week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReportCharts,
  exportAttendanceExcel,
  exportSalaryExcel
};
