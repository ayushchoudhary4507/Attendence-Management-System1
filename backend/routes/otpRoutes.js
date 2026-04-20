const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { authMiddleware } = require('../middleware/adminMiddleware');
const { sendOTP } = require('../utils/emailService');
const { sendMobileOTP } = require('../utils/smsService');

// Debug: Log when router is loaded
console.log('✅ otpRoutes loaded - registering routes: /send, /verify, /resend, /send-mobile, /verify-mobile');

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

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
    
    // Send OTP via SMS if mobile is provided
    if (normalizedMobile) {
      const smsResult = await sendMobileOTP(normalizedMobile, otp);
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.message);
        // Continue anyway - OTP is stored and can be viewed in terminal
      } else {
        console.log('✅ SMS sent successfully to:', normalizedMobile);
      }
    }
    
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

    // Send OTP via SMS
    const smsResult = await sendMobileOTP(mobile, otp);
    
    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send SMS: ' + smsResult.message 
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your mobile',
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
