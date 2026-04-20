const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/attendanceController');
const { authMiddleware, adminMiddleware } = require('../middleware/adminMiddleware');

// Mark attendance for today - Employee only
router.post('/mark', authMiddleware, markAttendance);

// Check out - Employee only
router.put('/checkout', authMiddleware, checkOut);

// Get my today's attendance - Employee only
router.get('/my-today', authMiddleware, getMyTodayAttendance);

// Get all employees with today's attendance - Admin only
router.get('/today', authMiddleware, getTodayAllAttendance);

// Get today's attendance status (active/inactive) - Admin only
router.get('/today-status', authMiddleware, getTodayAttendanceStatus);

// Get attendance stats (present/absent count) - Admin only
router.get('/stats', authMiddleware, getAttendanceStats);

// Get calendar data for a month
router.get('/calendar', authMiddleware, getCalendarData);

// Get attendance history for an employee
router.get('/history/:employeeId', authMiddleware, getAttendanceHistory);

// Admin mark attendance for any employee
router.post('/admin-mark', authMiddleware, adminMarkAttendance);

// LEAVE MANAGEMENT ROUTES
// Apply for leave - Employee only
router.post('/leave/apply', authMiddleware, applyLeave);

// Apply for leave with auto-approval - Employee only
router.post('/leave/apply-auto', authMiddleware, applyLeaveAuto);

// Get my leaves - Employee only
router.get('/leave/my-leaves', authMiddleware, getMyLeaves);

// Get all leaves (Admin)
router.get('/leave/all', authMiddleware, getAllLeaves);

// Get pending leaves count (Admin popup)
router.get('/leave/pending-count', authMiddleware, getPendingLeavesCount);

// Approve/Reject leave (Admin)
router.put('/leave/approve/:leaveId', authMiddleware, approveRejectLeave);

// Cancel leave (Employee)
router.put('/leave/cancel/:leaveId', authMiddleware, cancelLeave);

// Get attendance by specific date
router.get('/by-date', authMiddleware, getAttendanceByDate);

module.exports = router;
