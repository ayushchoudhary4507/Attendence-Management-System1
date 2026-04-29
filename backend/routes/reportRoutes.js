const express = require('express');
const router = express.Router();
const { authMiddleware, admin } = require('../middleware/authMiddleware');
const {
  getMonthlyReport,
  getAllMonthlyReports
} = require('../controllers/reportController');

// Employee can view their own report
router.get('/my-report', authMiddleware, getMonthlyReport);
router.get('/monthly/:userId', authMiddleware, getMonthlyReport);

// Admin can view all reports
router.get('/monthly', authMiddleware, admin, getAllMonthlyReports);

module.exports = router;
