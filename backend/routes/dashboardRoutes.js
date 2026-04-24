const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDashboardStatsByRange
} = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/adminMiddleware');

// @route   GET /api/dashboard
// @desc    Get all dashboard stats (single API endpoint)
// @access  Private
router.get('/', authMiddleware, getDashboardStats);

// @route   GET /api/dashboard/range
// @desc    Get dashboard stats for date range
// @access  Private (Admin only)
router.get('/range', authMiddleware, adminMiddleware, getDashboardStatsByRange);

module.exports = router;
