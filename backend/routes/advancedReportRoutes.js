const express = require('express');
const router = express.Router();
const { authMiddleware, admin } = require('../middleware/authMiddleware');
const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReportCharts,
  exportAttendanceExcel,
  exportSalaryExcel
} = require('../controllers/advancedReportController');

// Report APIs (authenticated users)
router.get('/daily', authMiddleware, getDailyReport);
router.get('/weekly', authMiddleware, getWeeklyReport);
router.get('/monthly-charts', authMiddleware, getMonthlyReportCharts);

// Export APIs
router.get('/export/attendance', authMiddleware, exportAttendanceExcel);
router.get('/export/salary', authMiddleware, admin, exportSalaryExcel);

module.exports = router;
