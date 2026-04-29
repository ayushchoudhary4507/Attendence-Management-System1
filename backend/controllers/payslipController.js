const PDFDocument = require('pdfkit');
const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Generate payslip PDF for an employee
const generatePayslip = async (req, res) => {
  try {
    let userId = req.params.userId || req.userId;
    if (req.user.role !== 'admin' && req.params.userId && req.params.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!req.params.userId) {
      userId = req.userId;
    }

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const m = Number(month);
    const y = Number(year);

    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const salary = await Salary.findOne({ employeeId: employee._id, month: m, year: y });
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found for this period' });
    }

    // Get attendance summary
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
    const totalWorkingDays = attendanceRecords.length;

    const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${employee.name}_${monthName}_${y}.pdf`);

    doc.pipe(res);

    // Header background
    doc.rect(0, 0, doc.page.width, 120).fill('#4361ee');

    // Company name
    doc.fontSize(24).fillColor('#ffffff')
      .text('ATTENDANCE MANAGEMENT SYSTEM', 50, 35, { align: 'center' });
    doc.fontSize(12).fillColor('#e0e0ff')
      .text('SALARY PAYSLIP', 50, 70, { align: 'center' });

    // Reset position
    let yPos = 140;

    // Employee details section
    doc.rect(50, yPos, 495, 25).fill('#f0f4ff');
    doc.fontSize(13).fillColor('#4361ee')
      .text('Employee Details', 60, yPos + 5);
    yPos += 35;

    const details = [
      ['Employee Name', employee.name],
      ['Employee ID', employee.employeeId],
      ['Email', employee.email],
      ['Designation', employee.designation || '-'],
      ['Department', employee.department || user.department || '-'],
      ['Pay Period', `${monthName} ${y}`]
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#666666').text(label, 60, yPos, { width: 150 });
      doc.fontSize(10).fillColor('#333333').text(`: ${value}`, 210, yPos);
      yPos += 20;
    });

    yPos += 10;

    // Attendance Summary
    doc.rect(50, yPos, 495, 25).fill('#f0f4ff');
    doc.fontSize(13).fillColor('#4361ee')
      .text('Attendance Summary', 60, yPos + 5);
    yPos += 35;

    const attDetails = [
      ['Total Working Days', totalWorkingDays.toString()],
      ['Days Present', totalPresent.toString()],
      ['Half Days', halfDays.toString()],
      ['Days Absent', totalAbsent.toString()],
      ['Leaves Taken', totalLeave.toString()],
      ['Present Days (Effective)', `${salary.totalPresentDays || totalPresent + (halfDays * 0.5)}`]
    ];

    attDetails.forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#666666').text(label, 60, yPos, { width: 200 });
      doc.fontSize(10).fillColor('#333333').text(`: ${value}`, 260, yPos);
      yPos += 20;
    });

    yPos += 10;

    // Salary Breakdown
    doc.rect(50, yPos, 495, 25).fill('#f0f4ff');
    doc.fontSize(13).fillColor('#4361ee')
      .text('Salary Breakdown', 60, yPos + 5);
    yPos += 35;

    // Table header
    doc.rect(50, yPos, 495, 25).fill('#4361ee');
    doc.fontSize(10).fillColor('#ffffff')
      .text('Description', 60, yPos + 7, { width: 300 })
      .text('Amount (₹)', 400, yPos + 7, { width: 140, align: 'right' });
    yPos += 30;

    const earnings = [
      ['Basic Salary', salary.basicSalary],
      ['Per Day Salary', salary.perDaySalary],
      ['Overtime Pay', salary.overtimePay || 0],
      ['Bonus', salary.bonus || 0]
    ];

    const deductions = [
      ['Absent Deductions', salary.deductions?.absentDeductions || 0],
      ['Late Deductions', salary.deductions?.lateDeductions || 0],
      ['Other Deductions', salary.deductions?.otherDeductions || 0]
    ];

    // Earnings
    doc.rect(50, yPos, 495, 20).fill('#f8f9fa');
    doc.fontSize(10).fillColor('#10b981').text('Earnings', 60, yPos + 4);
    yPos += 25;

    earnings.forEach(([label, amount]) => {
      doc.fontSize(10).fillColor('#666666').text(label, 60, yPos, { width: 300 });
      doc.fontSize(10).fillColor('#333333').text(`₹ ${Number(amount).toLocaleString('en-IN')}`, 400, yPos, { width: 140, align: 'right' });
      yPos += 20;
    });

    yPos += 5;

    // Deductions
    doc.rect(50, yPos, 495, 20).fill('#f8f9fa');
    doc.fontSize(10).fillColor('#ef4444').text('Deductions', 60, yPos + 4);
    yPos += 25;

    deductions.forEach(([label, amount]) => {
      doc.fontSize(10).fillColor('#666666').text(label, 60, yPos, { width: 300 });
      doc.fontSize(10).fillColor('#333333').text(`₹ ${Number(amount).toLocaleString('en-IN')}`, 400, yPos, { width: 140, align: 'right' });
      yPos += 20;
    });

    yPos += 10;

    // Total line
    doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor('#4361ee').lineWidth(2).stroke();
    yPos += 10;

    const totalDeductions = (salary.deductions?.absentDeductions || 0) +
      (salary.deductions?.lateDeductions || 0) +
      (salary.deductions?.otherDeductions || 0);

    // Net Salary
    doc.rect(50, yPos, 495, 35).fill('#f0f4ff');
    doc.fontSize(14).fillColor('#4361ee')
      .text('Net Salary', 60, yPos + 10, { width: 300 });
    doc.fontSize(16).fillColor('#4361ee')
      .text(`₹ ${Number(salary.finalSalary).toLocaleString('en-IN')}`, 400, yPos + 8, { width: 140, align: 'right' });
    yPos += 50;

    // Payment status
    doc.fontSize(10).fillColor(salary.isPaid ? '#10b981' : '#ef4444')
      .text(`Payment Status: ${salary.isPaid ? 'PAID' : 'PENDING'}`, 60, yPos);
    if (salary.isPaid && salary.paidOn) {
      doc.text(`Paid On: ${new Date(salary.paidOn).toLocaleDateString('en-IN')}`, 300, yPos);
    }
    yPos += 40;

    // Footer
    doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor('#cccccc').lineWidth(1).stroke();
    yPos += 10;
    doc.fontSize(8).fillColor('#999999')
      .text('This is a computer-generated payslip and does not require a signature.', 50, yPos, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 50, yPos + 12, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { generatePayslip };
