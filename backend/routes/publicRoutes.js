const express = require('express');
const router = express.Router();
const { getLandingPageStats } = require('../controllers/publicController');

/**
 * @swagger
 * components:
 *   schemas:
 *     LandingPageStats:
 *       type: object
 *       properties:
 *         totalEmployees:
 *           type: object
 *           properties:
 *             value:
 *               type: integer
 *             change:
 *               type: string
 *             trend:
 *               type: string
 *               enum: [up, down]
 *         onTime:
 *           type: object
 *           properties:
 *             value:
 *               type: integer
 *               description: Percentage
 *             change:
 *               type: string
 *             trend:
 *               type: string
 *         activeProjects:
 *           type: object
 *           properties:
 *             value:
 *               type: integer
 *             change:
 *               type: string
 *             trend:
 *               type: string
 *         avgAttendance:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             change:
 *               type: string
 *             trend:
 *               type: string
 *         chartData:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *               value:
 *                 type: integer
 *         todayStats:
 *           type: object
 *           properties:
 *             present:
 *               type: integer
 *             absent:
 *               type: integer
 *             leave:
 *               type: integer
 *             onTime:
 *               type: integer
 *             late:
 *               type: integer
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               action:
 *                 type: string
 *               time:
 *                 type: string
 *               status:
 *                 type: string
 */

/**
 * @swagger
 * /api/public/landing-stats:
 *   get:
 *     summary: Get landing page statistics
 *     description: Retrieve public statistics for the landing page (No authentication required)
 *     tags:
 *       - Public
 *     responses:
 *       200:
 *         description: Landing page statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LandingPageStats'
 *       500:
 *         description: Server error
 */

// Public route for landing page statistics (no authentication required)
router.get('/landing-stats', getLandingPageStats);

module.exports = router;
