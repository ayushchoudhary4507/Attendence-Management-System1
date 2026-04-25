const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { authMiddleware } = require('../middleware/adminMiddleware');
const { sendOTP } = require('../utils/emailService');
// SMS service removed - use email OTP only

// Debug: Log when router is loaded
console.log('✅ otpRoutes loaded - registering routes: /send, /verify, /resend, /send-mobile, /verify-mobile');

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

/**
 * @swagger
 * components:
 *   schemas:
 *     OTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         expiresIn:
 *           type: integer
 *           description: OTP expiry time in seconds
 *     OTPVerifyResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *           description: JWT token after successful verification
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 */

/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     summary: Send OTP
 *     description: Send OTP to email or mobile number
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User email for OTP
 *               mobile:
 *                 type: string
 *                 description: User mobile number for OTP
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         description: Email or mobile required
 *       404:
 *         description: User not found
 */

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP
router.post('/send', async (req, res) => {
  console.log('🔥 /send route handler called');
  console.log('Request body:', req.body);
  try {
    const { email, mobile } = req.body;
    
    if (!email && !mobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or mobile number required' 
      });
    }

    // Normalize mobile number - remove country code if present
    const normalizedMobile = mobile ? mobile.replace(/^91/, '') : null;
    
    // Find user by email or mobile - check both User and Employee models
    // User model uses 'phone' field, not 'mobile'
    let user;
    let userModel = 'User';
    
    if (email) {
      user = await User.findOne({ email });
    } else if (normalizedMobile) {
      user = await User.findOne({ phone: normalizedMobile });
    }
    
    if (!user) {
      // Try Employee model
      user = await Employee.findOne({ email });
      userModel = 'Employee';
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpKey = email || normalizedMobile;
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Send OTP via Email if email is provided
    if (email) {
      const emailResult = await sendOTP(email, otp);
      if (!emailResult.success) {
        // If email fails, still return success but log the error
        console.error('Email sending failed:', emailResult.message);
      }
    }
    
    // SMS service removed - use email OTP only
    
    // Log OTP for development/testing (remove in production)
    console.log(`OTP for ${otpKey}: ${otp}`);

    res.json({
      success: true,
      message: email ? 'OTP sent to your email' : 'OTP sent successfully',
      // Remove in production - for testing only
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP' 
    });
  }
});

/**
 * @swagger
 * /api/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     description: Verify OTP and login user
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 description: User email
 *               mobile:
 *                 type: string
 *                 description: User mobile number
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *     responses:
 *       200:
 *         description: OTP verified successfully, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPVerifyResponse'
 *       400:
 *         description: OTP required
 *       401:
 *         description: Invalid or expired OTP
 */

// Verify OTP and Login
router.post('/verify', async (req, res) => {
  try {
    const { email, mobile, otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP required' 
      });
    }

    const otpKey = email || mobile;
    const storedData = otpStore.get(otpKey);

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired' 
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    // Get user from correct model
    const Model = storedData.userModel === 'Employee' ? Employee : User;
    const user = await Model.findById(storedData.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Clear OTP
    otpStore.delete(otpKey);

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
});

/**
 * @swagger
 * /api/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     description: Resend OTP to email or mobile
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         description: Email or mobile required
 *       404:
 *         description: User not found
 */

// Resend OTP
router.post('/resend', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    
    if (!email && !mobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or mobile number required' 
      });
    }
    
    // Delete old OTP if exists
    const otpKey = email || mobile;
    otpStore.delete(otpKey);
    
    // Reuse send logic by making internal request
    // Forward to the /send endpoint
    req.url = '/send';
    return router.handle(req, res);
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend OTP' 
    });
  }
});

/**
 * @swagger
 * /api/otp/send-mobile:
 *   post:
 *     summary: Send Mobile OTP
 *     description: Send OTP via SMS to mobile number
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *                 description: Mobile number with country code
 *     responses:
 *       200:
 *         description: OTP sent via SMS
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         description: Mobile number required
 *       404:
 *         description: User not found
 */

// Send Mobile OTP
router.post('/send-mobile', async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile number required' 
      });
    }

    // Validate mobile number format (10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid mobile number. Please provide 10 digit mobile number' 
      });
    }

    // Find user by mobile - check both User and Employee models
    let user = await User.findOne({ mobile });
    let userModel = 'User';
    
    if (!user) {
      // Try Employee model
      user = await Employee.findOne({ mobile });
      userModel = 'Employee';
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found with this mobile number' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(mobile, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // SMS service removed - use email OTP only
    // OTP is stored and can be used for testing
    console.log(`OTP for ${mobile}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP generated successfully (SMS service disabled)',
      // Remove in production - for testing only
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send Mobile OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP' 
    });
  }
});

/**
 * @swagger
 * /api/otp/verify-mobile:
 *   post:
 *     summary: Verify Mobile OTP
 *     description: Verify SMS OTP and login
 *     tags:
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *               - otp
 *             properties:
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *     responses:
 *       200:
 *         description: Mobile OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPVerifyResponse'
 *       400:
 *         description: Mobile and OTP required
 *       401:
 *         description: Invalid or expired OTP
 */

// Verify Mobile OTP
router.post('/verify-mobile', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    
    if (!mobile || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile number and OTP required' 
      });
    }

    const storedData = otpStore.get(mobile);

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired' 
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(mobile);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    // Get user from correct model
    const Model = storedData.userModel === 'Employee' ? Employee : User;
    const user = await Model.findById(storedData.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Clear OTP
    otpStore.delete(mobile);

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify Mobile OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
});

// TEMPORARY: Update user mobile number
router.post('/update-mobile', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    
    if (!email || !mobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and mobile required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.mobile = mobile;
    await user.save();

    res.json({
      success: true,
      message: 'Mobile number updated successfully',
      user: {
        email: user.email,
        mobile: user.mobile
      }
    });

  } catch (error) {
    console.error('Update mobile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update mobile' 
    });
  }
});

module.exports = router;
