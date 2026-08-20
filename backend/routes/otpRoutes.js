const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { authMiddleware } = require('../middleware/adminMiddleware');
const { sendOTP } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

console.log('otpRoutes loaded - registering routes: /send, /verify, /resend');

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Flutter-side OTP registration: Flutter generates OTP, sends email itself, and stores OTP here
// This route NEVER sends email - just verifies user + stores OTP. Responds in <100ms.
router.post('/register-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const targetEmail = email.trim().toLowerCase();

    // Verify user exists
    let user = await User.findOne({ email: targetEmail });
    let userModel = 'User';
    if (!user) {
      user = await Employee.findOne({ email: targetEmail });
      if (user) userModel = 'Employee';
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Store OTP (provided by Flutter) with 5 minute expiry
    otpStore.set(targetEmail, {
      otp: String(otp).trim(),
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log('[register-otp] OTP stored for:', targetEmail, '| OTP:', otp);

    // Respond immediately - no email sending here (Flutter handles email)
    return res.json({ success: true, message: 'OTP registered successfully' });
  } catch (error) {
    console.error('register-otp error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to register OTP' });
  }
});

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
      const cleanDigits = String(inputMobile).replace(/\D/g, '');
      const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const phoneRegex = new RegExp(clean10);

      user = await User.findOne({
        $or: [
          { phone: phoneRegex },
          { mobile: phoneRegex },
          { phoneNumber: phoneRegex }
        ]
      });
      
      if (!user) {
        user = await Employee.findOne({
          $or: [
            { phone: phoneRegex },
            { mobile: phoneRegex },
            { contact: phoneRegex },
            { phoneNumber: phoneRegex }
          ]
        });
        if (user) userModel = 'Employee';
      }

      if (user) {
        targetEmail = user.email || null;
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this ' + (email ? 'email' : 'phone number') 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpKey = email 
      ? email.trim().toLowerCase() 
      : (inputMobile ? String(inputMobile).replace(/\D/g, '') : 'default');
    
    // Store OTP with expiry (5 minutes)
    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`OTP for ${otpKey} (${targetEmail || 'no-email'}): ${otp}`);

    const maskedEmail = targetEmail 
      ? targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c)
      : '';

    // Send email and SMS (awaited for Vercel/Serverless container lifecycle)
    let emailResult = null;
    let smsResult = null;

    if (targetEmail) {
      try {
        emailResult = await sendOTP(targetEmail, otp);
        console.log('[OTP EMAIL RESULT]:', emailResult);
      } catch (err) {
        console.error('[OTP EMAIL ERROR]:', err.message);
      }
    }

    if (inputMobile) {
      try {
        const cleanDigits = String(inputMobile).replace(/\D/g, '');
        const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
        smsResult = await sendSMS(clean10, `Your Attendance System OTP is ${otp}. Valid for 5 minutes.`);
        console.log('[OTP SMS RESULT]:', smsResult);
      } catch (err) {
        console.error('[OTP SMS ERROR]:', err.message);
      }
    }

    res.json({
      success: true,
      message: `OTP generated successfully for ${maskedEmail || 'account'}`,
      targetEmail: maskedEmail,
      otp: otp,
      emailSent: emailResult ? emailResult.success : false
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP: ' + (error.message || 'Unknown error') 
    });
  }
});

// Verify OTP and Reset Password / Login
router.post('/verify', async (req, res) => {
  try {
    const { email, mobile, phone, otp, password, newPassword } = req.body;
    const inputMobile = mobile || phone;
    
    if (!otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP required' 
      });
    }

    const otpKey = email ? email.trim().toLowerCase() : (inputMobile ? String(inputMobile).replace(/\D/g, '') : '');
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
    if (storedData.otp !== otp.trim()) {
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

    // Update password using base64 hashing (matching loginController & registerController)
    const nextPassword = newPassword || password;
    if (nextPassword) {
      const hashedPassword = Buffer.from(nextPassword).toString('base64');
      user.password = hashedPassword;
      await user.save();

      // Also update in User collection if Model was Employee or vice-versa
      if (user.email) {
        await User.updateOne({ email: user.email }, { $set: { password: hashedPassword } });
      }
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
      message: 'Password reset and verification successful',
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
      message: 'Failed to verify OTP: ' + (error.message || 'Unknown error') 
    });
  }
});

// Resend OTP
router.post('/resend', async (req, res) => {
  try {
    const { email, mobile, phone } = req.body;
    const inputMobile = mobile || phone;
    const otpKey = email ? email.trim().toLowerCase() : (inputMobile ? String(inputMobile).replace(/\D/g, '') : null);
    
    if (!otpKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or mobile required' 
      });
    }

    // Trigger send route handler logic
    req.body.mobile = inputMobile;
    return router.handle(req, res);
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend OTP' 
    });
  }
});

module.exports = router;
