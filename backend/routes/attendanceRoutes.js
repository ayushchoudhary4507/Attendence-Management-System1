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

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         employee:
 *           type: string
 *           description: Employee ID
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [present, absent, leave, half-day]
 *         checkIn:
 *           type: string
 *         checkOut:
 *           type: string
 *         notes:
 *           type: string
 *     Leave:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         employee:
 *           type: string
 *         leaveType:
 *           type: string
 *           enum: [Paid Leave, Casual Leave, Sick Leave, Emergency Leave, Unpaid Leave]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 */

/**
 * @swagger
 * /api/attendance/mark:
 *   post:
 *     summary: Mark attendance
 *     description: Mark today's attendance (Employee only)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [present, absent, leave, half-day]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/checkout:
 *   put:
 *     summary: Check out
 *     description: Check out for the day (Employee only)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/my-today:
 *   get:
 *     summary: Get my today's attendance
 *     description: Get current user's attendance for today
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Get all today's attendance
 *     description: Get all employees' attendance for today (Admin view)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all today's attendance
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/today-status:
 *   get:
 *     summary: Get today's attendance status
 *     description: Get present/absent/leave counts for today
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance status counts
 */

/**
 * @swagger
 * /api/attendance/stats:
 *   get:
 *     summary: Get attendance statistics
 *     description: Get attendance stats (present/absent count)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance statistics
 */

/**
 * @swagger
 * /api/attendance/calendar:
 *   get:
 *     summary: Get calendar data
 *     description: Get attendance data for calendar view
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year
 *     responses:
 *       200:
 *         description: Calendar attendance data
 */

/**
 * @swagger
 * /api/attendance/history/{employeeId}:
 *   get:
 *     summary: Get attendance history
 *     description: Get attendance history for a specific employee
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Attendance history
 */

/**
 * @swagger
 * /api/attendance/admin-mark:
 *   post:
 *     summary: Admin mark attendance
 *     description: Admin can mark attendance for any employee
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - status
 *             properties:
 *               employeeId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [present, absent, leave, half-day]
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 */

/**
 * @swagger
 * /api/attendance/leave/apply:
 *   post:
 *     summary: Apply for leave
 *     description: Apply for leave (Employee only)
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - startDate
 *               - endDate
 *             properties:
 *               leaveType:
 *                 type: string
 *                 enum: [Paid Leave, Casual Leave, Sick Leave, Emergency Leave, Unpaid Leave]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave applied successfully
 */

/**
 * @swagger
 * /api/attendance/leave/apply-auto:
 *   post:
 *     summary: Apply for leave (Auto-approve)
 *     description: Apply for leave with auto-approval
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - startDate
 *               - endDate
 *             properties:
 *               leaveType:
 *                 type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               reason:
 *                 type: string
 *               autoApprove:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Leave applied successfully
 */

/**
 * @swagger
 * /api/attendance/leave/my-leaves:
 *   get:
 *     summary: Get my leaves
 *     description: Get current user's leave applications
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leaves
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 */

/**
 * @swagger
 * /api/attendance/leave/all:
 *   get:
 *     summary: Get all leaves
 *     description: Get all leave applications (Admin view)
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (Pending, Approved, Rejected)
 *     responses:
 *       200:
 *         description: List of all leaves
 */

/**
 * @swagger
 * /api/attendance/leave/pending-count:
 *   get:
 *     summary: Get pending leaves count
 *     description: Get count of pending leave requests
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending leaves count
 */

/**
 * @swagger
 * /api/attendance/leave/approve/{leaveId}:
 *   put:
 *     summary: Approve/Reject leave
 *     description: Admin can approve or reject leave
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaveId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Approved, Rejected]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave status updated
 */

/**
 * @swagger
 * /api/attendance/leave/cancel/{leaveId}:
 *   put:
 *     summary: Cancel leave
 *     description: Cancel a leave application
 *     tags:
 *       - Leave
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaveId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave cancelled successfully
 */

/**
 * @swagger
 * /api/attendance/by-date:
 *   get:
 *     summary: Get attendance by date
 *     description: Get attendance records for a specific date
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Attendance records for the date
 */

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
