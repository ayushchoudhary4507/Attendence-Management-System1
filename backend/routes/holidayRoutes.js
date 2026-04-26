const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { authMiddleware, admin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Holiday:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         type:
 *           type: string
 *           enum: [public, company]
 *         description:
 *           type: string
 *         year:
 *           type: integer
 *         recurring:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get all holidays
 *     tags: [Holidays]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to filter holidays (default: current year)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [public, company]
 *         description: Filter by holiday type
 *     responses:
 *       200:
 *         description: Holidays retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, holidayController.getHolidays);

/**
 * @swagger
 * /api/holidays/{id}:
 *   get:
 *     summary: Get holiday by ID
 *     tags: [Holidays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday retrieved successfully
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, holidayController.getHolidayById);

/**
 * @swagger
 * /api/holidays:
 *   post:
 *     summary: Create new holiday (Admin only)
 *     tags: [Holidays]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [public, company]
 *               description:
 *                 type: string
 *               recurring:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Holiday created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, admin, holidayController.createHoliday);

/**
 * @swagger
 * /api/holidays/{id}:
 *   put:
 *     summary: Update holiday (Admin only)
 *     tags: [Holidays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [public, company]
 *               description:
 *                 type: string
 *               recurring:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *       404:
 *         description: Holiday not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, admin, holidayController.updateHoliday);

/**
 * @swagger
 * /api/holidays/{id}:
 *   delete:
 *     summary: Delete holiday (Admin only)
 *     tags: [Holidays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *       404:
 *         description: Holiday not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, admin, holidayController.deleteHoliday);

/**
 * @swagger
 * /api/holidays/check:
 *   get:
 *     summary: Check if a date is a holiday
 *     tags: [Holidays]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Holiday check result
 *       400:
 *         description: Date parameter required
 *       500:
 *         description: Server error
 */
router.get('/check', authMiddleware, holidayController.checkHoliday);

/**
 * @swagger
 * /api/holidays/import:
 *   post:
 *     summary: Import public holidays (Admin only)
 *     tags: [Holidays]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year:
 *                 type: integer
 *                 description: Year to import holidays for (default: current year)
 *               country:
 *                 type: string
 *                 description: Country code for holidays (currently supports India)
 *     responses:
 *       200:
 *         description: Holidays imported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.post('/import', authMiddleware, admin, holidayController.importPublicHolidays);

module.exports = router;
