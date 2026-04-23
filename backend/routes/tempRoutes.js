const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * @swagger
 * components:
 *   schemas:
 *     MakeAdminRequest:
 *       type: object
 *       required:
 *         - email
 *         - secretKey
 *       properties:
 *         email:
 *           type: string
 *           description: User email to promote to admin
 *           example: "user@gmail.com"
 *         secretKey:
 *           type: string
 *           description: Secret key for authorization
 *           example: "setup123"
 *     MakeAdminResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             role:
 *               type: string
 *               example: "admin"
 */

/**
 * @swagger
 * /api/temp/make-admin:
 *   post:
 *     summary: Promote user to admin (Temporary/Setup only)
 *     description: Temporarily promote a user to admin role using secret key. For initial setup only.
 *     tags:
 *       - Temporary
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MakeAdminRequest'
 *     responses:
 *       200:
 *         description: User promoted to admin successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MakeAdminResponse'
 *       403:
 *         description: Invalid secret key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid secret key"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 */

// TEMPORARY: Promote user to admin (for setup only)
router.post('/make-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Simple security - only works with secret key
    if (secretKey !== 'setup123') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }
    
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User promoted to admin',
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
