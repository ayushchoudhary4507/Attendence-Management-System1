const express = require('express');
const router = express.Router();
const dashboardConfigController = require('../controllers/dashboardConfigController');
const { adminMiddleware, authMiddleware } = require('../middleware/adminMiddleware');

// Optional auth helper to attach user if token exists, but not fail if public fetch
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();
  authMiddleware(req, res, next);
};

/**
 * @swagger
 * /api/dashboard-config:
 *   get:
 *     summary: Get dashboard configuration
 *     description: Retrieve active dashboard overview cards configuration
 *     tags:
 *       - Dashboard Config
 *     responses:
 *       200:
 *         description: Dashboard configuration retrieved successfully
 *   put:
 *     summary: Update dashboard configuration
 *     description: Update visibility and order of dashboard overview cards (Admin only)
 *     tags:
 *       - Dashboard Config
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard configuration updated successfully
 */

// GET dashboard configuration (mobile app, web app, admin)
router.get('/', optionalAuth, dashboardConfigController.getDashboardConfig);

// PUT update dashboard configuration (Admin only)
router.put('/', adminMiddleware, dashboardConfigController.updateDashboardConfig);

// POST reset dashboard configuration to factory defaults (Admin only)
router.post('/reset', adminMiddleware, dashboardConfigController.resetDashboardConfig);

module.exports = router;
