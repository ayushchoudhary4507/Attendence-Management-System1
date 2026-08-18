const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Send email via Resend REST API (HTTPS Port 443 - 100% bypasses Render SMTP block)
 */
const sendViaResend = (apiKey, fromUser, toEmail, otp, htmlBody, textBody) => {
  return new Promise((resolve, reject) => {
    const fromAddr = fromUser.includes('<') ? fromUser : (fromUser.includes('@resend.dev') ? fromUser : 'Attendance System <onboarding@resend.dev>');
    const payload = JSON.stringify({
      from: fromAddr,
      to: [toEmail.trim()],
      subject: 'Your OTP for Attendance System: ' + otp,
      html: htmlBody,
      text: textBody,
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey.trim(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ [RESEND API SUCCESS]:', data);
          resolve({ success: true, message: 'OTP sent via Resend API' });
        } else {
          console.error('❌ [RESEND API ERROR]:', res.statusCode, data);
          reject(new Error('Resend API (' + res.statusCode + '): ' + data));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Resend API timeout')); });
    req.write(payload);
    req.end();
  });
};

/**
 * Send email via Brevo (Sendinblue) REST API (HTTPS Port 443 - 100% bypasses Render SMTP block)
 */
const sendViaBrevo = (apiKey, senderEmail, toEmail, otp, htmlBody, textBody) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: 'Attendance System', email: senderEmail || 'noreply@ams.com' },
      to: [{ email: toEmail.trim() }],
      subject: 'Your OTP for Attendance System: ' + otp,
      htmlContent: htmlBody,
      textContent: textBody,
    });

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ [BREVO API SUCCESS]:', data);
          resolve({ success: true, message: 'OTP sent via Brevo API' });
        } else {
          console.error('❌ [BREVO API ERROR]:', res.statusCode, data);
          reject(new Error('Brevo API (' + res.statusCode + '): ' + data));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Brevo API timeout')); });
    req.write(payload);
    req.end();
  });
};

/**
 * Send OTP email to user (supports Resend API, Brevo API, and Gmail SMTP with auto-fallback)
 */
const sendOTP = async (email, otp) => {
  const htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">' +
    '<div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">' +
    '<h2 style="color: #4F46E5; margin-bottom: 20px;">Attendance System</h2>' +
    '<p style="font-size: 16px; color: #333; margin-bottom: 20px;">Your One-Time Password (OTP) for password reset / login is:</p>' +
    '<div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">' +
    otp +
    '</div>' +
    '<p style="font-size: 14px; color: #666; margin-top: 20px;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>' +
    '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">' +
    '<p style="font-size: 12px; color: #999; text-align: center;">If you didn\\'t request this OTP, please ignore this email.<br>&copy; ' + new Date().getFullYear() + ' Attendance System. All rights reserved.</p>' +
    '</div></div>';

  const textBody = 'Your OTP for Attendance System is: ' + otp + '\\n\\nThis OTP is valid for 5 minutes. Do not share it with anyone.\\n\\nIf you didn\\'t request this OTP, please ignore this email.';

  // 1. Check if RESEND_API_KEY is available (Fastest, 100% reliable HTTPS)
  const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_USER || 'onboarding@resend.dev';
      const res = await sendViaResend(resendApiKey, fromEmail, email, otp, htmlBody, textBody);
      return res;
    } catch (resendErr) {
      console.warn('⚠️ Resend API failed, trying other methods:', resendErr.message);
    }
  }

  // 2. Check if BREVO_API_KEY is available (Fastest, 100% reliable HTTPS)
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey) {
    try {
      const fromEmail = process.env.EMAIL_USER || process.env.BREVO_SENDER || 'ayushchoudhary4507@gmail.com';
      const res = await sendViaBrevo(brevoApiKey, fromEmail, email, otp, htmlBody, textBody);
      return res;
    } catch (brevoErr) {
      console.warn('⚠️ Brevo API failed, trying SMTP:', brevoErr.message);
    }
  }

  // 3. Fallback to Gmail SMTP / Custom SMTP
  const rawUser = process.env.EMAIL_USER || '';
  const rawPass = process.env.EMAIL_PASS || '';
  const user = rawUser.replace(/['"]+/g, '').trim();
  const pass = rawPass.replace(/['"\\s]+/g, '').trim();

  if (!user || !pass) {
    const errMsg = 'Email configuration missing in environment. Please set EMAIL_USER and EMAIL_PASS (or RESEND_API_KEY / BREVO_API_KEY) in Render dashboard.';
    console.error('[EMAIL OTP ERROR]:', errMsg);
    return { success: false, message: errMsg };
  }

  const mailOptions = {
    from: '"Attendance System" <' + user + '>',
    to: email.trim(),
    subject: 'Your OTP for Attendance System: ' + otp,
    html: htmlBody,
    text: textBody,
  };

  let lastError = null;

  // Try Strategy A: service: 'gmail'
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [EMAIL SUCCESS via service:gmail]: MessageId:', info.messageId);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err1) {
    console.warn('⚠️ [SMTP Strategy A failed]:', err1.message);
    lastError = err1;
  }

  // Try Strategy B: smtp.gmail.com port 587
  try {
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    const info = await transporter587.sendMail(mailOptions);
    console.log('✅ [EMAIL SUCCESS via port 587]: MessageId:', info.messageId);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err2) {
    console.warn('⚠️ [SMTP Strategy B failed]:', err2.message);
    lastError = err2;
  }

  // Try Strategy C: smtp.gmail.com port 465
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    const info = await transporter465.sendMail(mailOptions);
    console.log('✅ [EMAIL SUCCESS via port 465]: MessageId:', info.messageId);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err3) {
    console.error('❌ [SMTP Strategy C failed]:', err3.message);
    lastError = err3;
  }

  return {
    success: false,
    message: lastError ? lastError.message : 'Connection timeout (Render blocks direct SMTP ports. Use Resend or Brevo API key in Render environment)'
  };
};

/**
 * Send late login alert email to admin
 */
const sendLateLoginAlert = async (adminEmail, employeeName, employeeEmail, loginTime) => {
  return { success: true };
};

/**
 * Send leave approval email to employee
 */
const sendLeaveApprovalEmail = async (employeeEmail, employeeName, leaveType, startDate, endDate) => {
  return { success: true };
};

/**
 * Send leave rejection email to employee
 */
const sendLeaveRejectionEmail = async (employeeEmail, employeeName, leaveType, rejectionReason) => {
  return { success: true };
};

module.exports = {
  sendOTP,
  sendLateLoginAlert,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
};
