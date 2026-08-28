const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { authMiddleware } = require('../middleware/adminMiddleware');
const { sendOTP } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

console.log('otpRoutes loaded - registering routes: /send, /verify, /resend, /register-otp');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory OTP storage (use Redis in production)
// ─────────────────────────────────────────────────────────────────────────────
const otpStore = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Per-email rate limiter: max 5 OTP send attempts per identifier per 10 minutes
// ─────────────────────────────────────────────────────────────────────────────
const otpRateStore = new Map();
const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const checkOtpRateLimit = (key) => {
  const now = Date.now();
  const entry = otpRateStore.get(key);
  if (!entry || now > entry.resetAt) {
    otpRateStore.set(key, { count: 1, resetAt: now + OTP_RATE_WINDOW_MS });
    return { allowed: true, remaining: OTP_RATE_LIMIT - 1, resetInMs: OTP_RATE_WINDOW_MS };
  }
  if (entry.count >= OTP_RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { allowed: true, remaining: OTP_RATE_LIMIT - entry.count, resetInMs: entry.resetAt - now };
};

// ─────────────────────────────────────────────────────────────────────────────
// Email format validator
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (str) => EMAIL_REGEX.test(String(str || '').trim());

// ─────────────────────────────────────────────────────────────────────────────
// Generate 6-digit OTP
// ─────────────────────────────────────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────────────────────────────────────────
// Mask OTP for logging: "382910" => "3*****"
// ─────────────────────────────────────────────────────────────────────────────
const maskOTP = (otp) => {
  if (!otp || otp.length < 2) return '******';
  return otp[0] + '*'.repeat(otp.length - 1);
};

// ─────────────────────────────────────────────────────────────────────────────
// Mask email for logging: "user@gmail.com" => "u***@gmail.com"
// ─────────────────────────────────────────────────────────────────────────────
const maskEmail = (email) => {
  if (!email) return '(none)';
  return String(email).replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c);
};

// ─────────────────────────────────────────────────────────────────────────────
// Core send-OTP logic — shared by /send and /resend
// ─────────────────────────────────────────────────────────────────────────────
const executeSendOtp = async (req, res) => {
  const endpoint = req.originalUrl || '/api/auth/send';
  console.log('\n' + '='.repeat(56));
  console.log(`[OTP SEND] Endpoint called: POST ${endpoint}`);
  console.log(`[OTP SEND] Body keys received: ${Object.keys(req.body || {}).join(', ')}`);

  try {
    const { email, mobile, phone } = req.body || {};
    const inputMobile = mobile || phone;

    if (!email && !inputMobile) {
      console.warn('[OTP SEND] Rejected: no email or mobile in request');
      return res.status(400).json({ success: false, message: 'Email or mobile number required' });
    }

    // Email format validation
    if (email && !isValidEmail(email)) {
      console.warn(`[OTP SEND] Rejected: invalid email format -> "${email}"`);
      return res.status(400).json({ success: false, message: 'Invalid email address format. Please enter a valid email.' });
    }

    // Per-identifier rate limit
    const rateLimitKey = email ? email.trim().toLowerCase() : String(inputMobile).replace(/\D/g, '');
    const rateCheck = checkOtpRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      const waitMin = Math.ceil(rateCheck.resetInMs / 60000);
      console.warn(`[OTP SEND] Rate limited: ${maskEmail(email || inputMobile)} — retry in ${waitMin} min`);
      return res.status(429).json({ success: false, message: `Too many OTP requests. Please wait ${waitMin} minute(s) before trying again.` });
    }

    // Look up user by email or mobile
    let user;
    let userModel = 'User';
    let targetEmail = email ? email.trim().toLowerCase() : null;

    if (email) {
      console.log(`[OTP SEND] Looking up user by email: ${maskEmail(targetEmail)}`);
      user = await User.findOne({ email: targetEmail });
      if (!user) {
        user = await Employee.findOne({ email: targetEmail });
        if (user) userModel = 'Employee';
      }
    } else if (inputMobile) {
      const cleanDigits = String(inputMobile).replace(/\D/g, '');
      const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const phoneRegex = new RegExp(clean10);
      console.log(`[OTP SEND] Looking up user by mobile: ***${clean10.slice(-4)}`);

      user = await User.findOne({ $or: [{ phone: phoneRegex }, { mobile: phoneRegex }, { phoneNumber: phoneRegex }] });
      if (!user) {
        user = await Employee.findOne({ $or: [{ phone: phoneRegex }, { mobile: phoneRegex }, { contact: phoneRegex }, { phoneNumber: phoneRegex }] });
        if (user) userModel = 'Employee';
      }
      if (user) targetEmail = user.email || null;
    }

    if (!user) {
      console.warn(`[OTP SEND] User not found for: ${maskEmail(email || inputMobile)}`);
      return res.status(404).json({ success: false, message: 'No account found with this ' + (email ? 'email address' : 'phone number') });
    }

    console.log(`[OTP SEND] User found — model: ${userModel}`);

    // Generate OTP and store it
    const otp = generateOTP();
    const otpKey = email ? email.trim().toLowerCase() : (inputMobile ? String(inputMobile).replace(/\D/g, '') : 'default');

    otpStore.set(otpKey, {
      otp,
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // SECURITY: Only log masked OTP
    console.log(`[OTP SEND] OTP generated | Key: ${maskEmail(otpKey)} | OTP: ${maskOTP(otp)} | Expires: 5 min`);

    // Send OTP email to the ENTERED email address (dynamic, from request body)
    let emailResult = null;
    if (targetEmail) {
      console.log(`[OTP SEND] Sending OTP email -> Recipient: ${maskEmail(targetEmail)}`);
      try {
        emailResult = await sendOTP(targetEmail, otp);
        if (emailResult && emailResult.success) {
          console.log(`[OTP SEND] SMTP/API SUCCESS — OTP email sent to: ${maskEmail(targetEmail)}`);
        } else {
          console.error(`[OTP SEND] SMTP/API FAILED for: ${maskEmail(targetEmail)} | Reason: ${emailResult ? emailResult.message : 'unknown'}`);
        }
      } catch (emailErr) {
        console.error(`[OTP SEND] Email threw exception for: ${maskEmail(targetEmail)} | ${emailErr.message}`);
        emailResult = { success: false, message: emailErr.message };
      }
    }

    // Send SMS if mobile provided
    let smsResult = null;
    if (inputMobile) {
      try {
        const cleanDigits = String(inputMobile).replace(/\D/g, '');
        const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
        smsResult = await sendSMS(clean10, `Your Attendance System OTP is ${otp}. Valid for 5 minutes.`);
        console.log(`[OTP SEND] SMS result: ${JSON.stringify(smsResult)}`);
      } catch (smsErr) {
        console.error(`[OTP SEND] SMS error: ${smsErr.message}`);
      }
    }

    console.log('='.repeat(56) + '\n');

    // SECURITY: Never include the OTP in the API response
    const maskedEmail = maskEmail(targetEmail || '');
    return res.json({
      success: true,
      message: `OTP sent successfully to ${maskedEmail}`,
      targetEmail: maskedEmail,
      emailSent: emailResult ? emailResult.success : false,
    });

  } catch (error) {
    console.error(`[OTP SEND] Unhandled error: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({ success: false, message: 'Failed to send OTP: ' + (error.message || 'Unknown error') });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /register-otp  — Flutter-side: store Flutter-generated OTP server-side
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email address format' });

    const targetEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: targetEmail });
    let userModel = 'User';
    if (!user) {
      user = await Employee.findOne({ email: targetEmail });
      if (user) userModel = 'Employee';
    }

    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email address' });

    otpStore.set(targetEmail, {
      otp: String(otp).trim(),
      userId: user._id,
      userModel,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`[register-otp] OTP stored for: ${maskEmail(targetEmail)} | OTP: ${maskOTP(String(otp))}`);
    return res.json({ success: true, message: 'OTP registered successfully' });
  } catch (error) {
    console.error('register-otp error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to register OTP' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /send — Generate OTP, store it, email it to the user-entered address
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send', (req, res) => {
  console.log('[OTP] POST /send called');
  return executeSendOtp(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /verify — Verify OTP and optionally reset password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  console.log('\n[OTP VERIFY] POST /verify called');
  try {
    const { email, mobile, phone, otp, password, newPassword } = req.body;
    const inputMobile = mobile || phone;

    if (!otp) return res.status(400).json({ success: false, message: 'OTP required' });
    if (email && !isValidEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email address format' });

    const otpKey = email ? email.trim().toLowerCase() : (inputMobile ? String(inputMobile).replace(/\D/g, '') : '');
    if (!otpKey) return res.status(400).json({ success: false, message: 'Email or mobile required' });

    const storedData = otpStore.get(otpKey);
    if (!storedData) {
      console.warn(`[OTP VERIFY] No OTP found for: ${maskEmail(otpKey)}`);
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new OTP.' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(otpKey);
      console.warn(`[OTP VERIFY] OTP expired for: ${maskEmail(otpKey)}`);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Constant-time comparison to prevent timing attacks
    const providedOtp = otp.trim();
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(storedData.otp.padEnd(10, '0')),
      Buffer.from(providedOtp.padEnd(10, '0'))
    );

    if (!isMatch) {
      console.warn(`[OTP VERIFY] Invalid OTP attempt for: ${maskEmail(otpKey)}`);
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check the code sent to your email.' });
    }

    console.log(`[OTP VERIFY] OTP verified for: ${maskEmail(otpKey)}`);

    const Model = storedData.userModel === 'Employee' ? Employee : User;
    const user = await Model.findById(storedData.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const nextPassword = newPassword || password;
    if (nextPassword) {
      const hashedPassword = Buffer.from(nextPassword).toString('base64');
      user.password = hashedPassword;
      await user.save();
      if (user.email) {
        await User.updateOne({ email: user.email }, { $set: { password: hashedPassword } });
      }
      console.log(`[OTP VERIFY] Password updated for: ${maskEmail(otpKey)}`);
    }

    otpStore.delete(otpKey);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`[OTP VERIFY] Token issued for: ${maskEmail(otpKey)}\n`);

    // Send employee_login notification to admins (for OTP-based mobile login)
    try {
      if (user.role !== 'admin') {
        const Notification = require('../models/Notification');
        const { sendLoginNotificationToAdmins } = require('../utils/fcmService');
        const loginDateObj = new Date();

        // Detect source — OTP verify is always mobile-initiated
        const loginSource = (req.body.loginSource === 'Web') ? 'Web' : 'Mobile';
        const deviceInfo = req.body.deviceInfo || req.headers['x-device-info'] || '';
        const xPlatform = (req.headers['x-platform'] || '').toLowerCase();
        const finalSource = (xPlatform === 'web') ? 'Web' : loginSource;

        const formattedLoginTime = loginDateObj.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const formattedLoginDate = loginDateObj.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const sourceEmoji = finalSource === 'Mobile' ? '📱' : '🌐';
        const notifTitle = 'User Login Alert';
        const notifMessage = `${user.name} logged in at ${formattedLoginTime} via ${finalSource} ${sourceEmoji}`;

        const admins = await User.find({ role: 'admin' }).select('_id fcmTokens');
        const activityNotifications = [];
        for (const admin of admins) {
          const adminNotification = await Notification.create({
            type: 'employee_login',
            title: notifTitle,
            message: notifMessage,
            senderId: user._id,
            senderName: user.name,
            employeeId: user._id,
            employeeName: user.name,
            employeeEmail: user.email,
            receiverId: admin._id,
            loginSource: finalSource,
            deviceInfo: String(deviceInfo).substring(0, 200),
            loginDate: formattedLoginDate,
            loginTime: formattedLoginTime,
            link: '/employees',
          });
          activityNotifications.push({ notification: adminNotification, admin });
        }

        const io = global._io;
        const offlineAdmins = [];
        for (const { notification, admin } of activityNotifications) {
          const adminId = admin._id.toString();
          const onlineUsersMap = io ? io.onlineUsers : null;
          const adminOnline = onlineUsersMap ? onlineUsersMap.get(adminId) : null;
          if (adminOnline && adminOnline.isOnline) {
            io.to(adminOnline.socketId).emit('newNotification', {
              id: notification._id,
              type: 'employee_login',
              notificationType: 'employee_login',
              title: notifTitle,
              message: notifMessage,
              employeeId: user._id.toString(),
              employeeName: user.name,
              employeeEmail: user.email,
              loginSource: finalSource,
              loginTime: formattedLoginTime,
              loginDate: formattedLoginDate,
              senderId: user._id.toString(),
              senderName: user.name,
              receiverId: adminId,
              link: '/employees',
              createdAt: loginDateObj,
              read: false
            });
          }
          offlineAdmins.push(admin);
        }
        if (admins.length > 0) {
          sendLoginNotificationToAdmins(admins, {
            title: notifTitle,
            message: notifMessage,
            employeeName: user.name,
            employeeEmail: user.email,
            employeeId: user._id.toString(),
            loginSource: finalSource,
            loginDate: formattedLoginDate,
            loginTime: formattedLoginTime
          }).catch(err => console.error('FCM push error (non-critical):', err.message));
        }
        console.log(`✅ OTP-based login notification sent for ${user.email} (${finalSource})`);
      }
    } catch (notifErr) {
      console.error('OTP verify: login notification error (non-critical):', notifErr.message);
    }

    return res.json({
      success: true,
      message: 'Password reset and verification successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });

  } catch (error) {
    console.error(`[OTP VERIFY] Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP: ' + (error.message || 'Unknown error') });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /resend — Re-send OTP to same identifier (reuses send logic)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/resend', (req, res) => {
  console.log('[OTP] POST /resend called — delegating to send logic');
  const { email, mobile, phone } = req.body || {};
  if (!email && !mobile && !phone) {
    return res.status(400).json({ success: false, message: 'Email or mobile required' });
  }
  return executeSendOtp(req, res);
});

module.exports = router;
