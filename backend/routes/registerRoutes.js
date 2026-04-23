const express = require('express');
const { registerController } = require('../controllers/registerController');

const router = express.Router();

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: User full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 description: User email (Gmail only)
 *                 example: "user@gmail.com"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 description: User role
 *                 enum: [admin, employee]
 *                 example: "employee"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/', registerController);

module.exports = router;
