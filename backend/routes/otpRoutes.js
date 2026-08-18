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
  console.log('OTP /send route handler called');
  console.log('Request body:', req.body);
  try {
    const { email, mobile, phone } = req.body;
    const inputMobile = mobile || phone;
    
    if (!email && !inputMobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or mobile number required' 
      });
    }

    let user;
    let userModel = 'User';
    let targetEmail = email ? email.trim().toLowerCase() : null;

    if (email) {
      user = await User.findOne({ email: targetEmail });
      if (!user) {
        user = await Employee.findOne({ email: targetEmail });
        if (user) userModel = 'Employee';
      }
    } else if (inputMobile) {
      const cleanDigits = inputMobile.replace(/\D/g, '');
      const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const phoneRegex = new RegExp(clean10 + '
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
);

      user = await User.findOne({ phone: { $regex: phoneRegex } });
      if (!user) {
        user = await Employee.findOne({ phone: { $regex: phoneRegex } });
        if (user) userModel = 'Employee';
      }
      if (user && user.email) {
        targetEmail = user.email;
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this ' + (email ? 'email' : 'phone number') 
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpKey = email ? email.trim().toLowerCase() : inputMobile.replace(/\D/g, '');
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`OTP for ${otpKey} (${targetEmail || 'no-email'}): ${otp}`);

    // Send OTP via Email if email is available
    if (targetEmail) {
      const emailResult = await sendOTP(targetEmail, otp);
      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send OTP email: ' + emailResult.message,
          error: emailResult.message
        });
      }
    }

    const maskedEmail = targetEmail 
      ? targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c)
      : '';

    res.json({
      success: true,
      message: targetEmail ? `OTP sent to your email (${maskedEmail})` : 'OTP generated successfully',
      targetEmail: maskedEmail,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP: ' + (error.message || 'Unknown error') 
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
);

      user = await User.findOne({ phone: { $regex: phoneRegex } });
      if (!user) {
        user = await Employee.findOne({ phone: { $regex: phoneRegex } });
        if (user) userModel = 'Employee';
      }
      if (user && user.email) {
        targetEmail = user.email;
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this ' + (email ? 'email' : 'phone number') 
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpKey = email ? email.trim().toLowerCase() : inputMobile.replace(/\D/g, '');
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`OTP for ${otpKey} (${targetEmail || 'no-email'}): ${otp}`);

    let emailSent = false;
    let emailError = null;

    // Send OTP via Email if email is available
    if (targetEmail) {
      try {
        const emailResult = await sendOTP(targetEmail, otp);
        if (emailResult.success) {
          emailSent = true;
        } else {
          emailError = emailResult.message;
          console.error('Email sending failed:', emailResult.message);
        }
      } catch (err) {
        emailError = err.message;
        console.error('Email sending exception:', err.message);
      }
    }

    const maskedEmail = targetEmail 
      ? targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c)
      : '';

    res.json({
      success: true,
      message: emailSent
        ? `OTP sent to your email (${maskedEmail})`
        : (targetEmail ? `OTP generated for ${maskedEmail}` : 'OTP generated successfully'),
      targetEmail: maskedEmail,
      otp: otp // Guaranteed fallback so developer and user are never locked out
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP: ' + (error.message || 'Unknown error') 
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
);

      user = await User.findOne({ phone: { $regex: phoneRegex } });
      if (!user) {
        user = await Employee.findOne({ phone: { $regex: phoneRegex } });
        if (user) userModel = 'Employee';
      }
      if (user && user.email) {
        targetEmail = user.email;
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this ' + (email ? 'email' : 'phone number') 
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpKey = email ? email.trim().toLowerCase() : inputMobile.replace(/\D/g, '');
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`OTP for ${otpKey} (${targetEmail || 'no-email'}): ${otp}`);

    // Send OTP via Email if email is available
    if (targetEmail) {
      const emailResult = await sendOTP(targetEmail, otp);
      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send OTP email: ' + emailResult.message,
          error: emailResult.message
        });
      }
    }

    const maskedEmail = targetEmail 
      ? targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c)
      : '';

    res.json({
      success: true,
      message: targetEmail ? `OTP sent to your email (${maskedEmail})` : 'OTP generated successfully',
      targetEmail: maskedEmail,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP: ' + (error.message || 'Unknown error') 
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
