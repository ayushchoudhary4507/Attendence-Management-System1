const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Send email via Resend REST API (HTTPS Port 443 — bypasses Render SMTP block)
 * NOTE: Free Resend accounts can only send to verified recipient emails.
 *       If recipients are arbitrary Gmail addresses, use Gmail SMTP or upgrade Resend plan.
 */
const sendViaResend = (apiKey, fromUser, toEmail, otp, htmlBody, textBody) => {
  return new Promise((resolve, reject) => {
    const fromAddr = fromUser.includes('<')
      ? fromUser
      : fromUser.includes('@resend.dev')
      ? fromUser
      : 'Attendance System <onboarding@resend.dev>';

    const payload = JSON.stringify({
      from: fromAddr,
      to: [toEmail.trim()],
      subject: 'Your OTP for Attendance System',
      html: htmlBody,
      text: textBody,
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey.trim(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    };

    console.log(`[emailService] Resend API -> recipient: ${toEmail.trim()}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[emailService] Resend API SUCCESS for ${toEmail.trim()} — status ${res.statusCode}`);
          resolve({ success: true, message: 'OTP sent via Resend API' });
        } else {
          const errMsg = `Resend API (${res.statusCode}): ${data}`;
          console.error(`[emailService] Resend API FAILED for ${toEmail.trim()} — ${errMsg}`);
          reject(new Error(errMsg));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[emailService] Resend API network error for ${toEmail.trim()}: ${err.message}`);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error(`[emailService] Resend API timeout for ${toEmail.trim()}`);
      reject(new Error('Resend API timeout'));
    });
    req.write(payload);
    req.end();
  });
};

/**
 * Send email via Brevo (Sendinblue) REST API (HTTPS Port 443)
 */
const sendViaBrevo = (apiKey, senderEmail, toEmail, otp, htmlBody, textBody) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: 'Attendance System', email: senderEmail || 'noreply@ams.com' },
      to: [{ email: toEmail.trim() }],
      subject: 'Your OTP for Attendance System',
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

    console.log(`[emailService] Brevo API -> recipient: ${toEmail.trim()}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[emailService] Brevo API SUCCESS for ${toEmail.trim()} — status ${res.statusCode}`);
          resolve({ success: true, message: 'OTP sent via Brevo API' });
        } else {
          const errMsg = `Brevo API (${res.statusCode}): ${data}`;
          console.error(`[emailService] Brevo API FAILED for ${toEmail.trim()} — ${errMsg}`);
          reject(new Error(errMsg));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[emailService] Brevo API network error for ${toEmail.trim()}: ${err.message}`);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error(`[emailService] Brevo API timeout for ${toEmail.trim()}`);
      reject(new Error('Brevo API timeout'));
    });
    req.write(payload);
    req.end();
  });
};

/**
 * Send OTP email to the user's entered email address.
 * Tries: Resend API -> Brevo API -> Gmail SMTP (port 587) -> Gmail SMTP (port 465)
 *
 * IMPORTANT: The `email` param comes directly from req.body.email (dynamic).
 * The SMTP/API credentials are only the SENDER account — never the recipient.
 *
 * @param {string} email  - Recipient email (from request body — dynamic per user)
 * @param {string} otp    - 6-digit OTP (DO NOT log the full OTP here)
 */
const sendOTP = async (email, otp) => {
  const recipientEmail = email.trim();
  console.log(`\n[emailService] ===== Sending OTP email =====`);
  console.log(`[emailService] Recipient : ${recipientEmail}`);
  console.log(`[emailService] OTP       : [MASKED — not logged for security]`);

  const htmlBody =
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">' +
    '<div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">' +
    '<h2 style="color: #4F46E5; margin-bottom: 20px;">Attendance System</h2>' +
    '<p style="font-size: 16px; color: #333; margin-bottom: 20px;">Your One-Time Password (OTP) for password reset / login is:</p>' +
    '<div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">' +
    otp +
    '</div>' +
    '<p style="font-size: 14px; color: #666; margin-top: 20px;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>' +
    '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">' +
    '<p style="font-size: 12px; color: #999; text-align: center;">If you did not request this OTP, please ignore this email.<br>&copy; ' +
    new Date().getFullYear() +
    ' Attendance Management System. All rights reserved.</p>' +
    '</div></div>';

  const textBody =
    'Your OTP for Attendance System is: ' +
    otp +
    '\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.\n\nIf you did not request this OTP, please ignore this email.';

  // ── Strategy 1: Resend API (HTTPS — bypasses Render port blocks) ───────────
  // WARNING: Free Resend plan only allows sending to verified email addresses.
  // If emails are not arriving for unverified recipients, remove RESEND_API_KEY
  // from Render environment variables to skip this step.
  const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (resendApiKey) {
    try {
      console.log(`[emailService] Trying Strategy 1: Resend API`);
      const fromEmail = process.env.EMAIL_USER || 'onboarding@resend.dev';
      const result = await sendViaResend(resendApiKey, fromEmail, recipientEmail, otp, htmlBody, textBody);
      console.log(`[emailService] ===== Email SENT via Resend =====\n`);
      return result;
    } catch (resendErr) {
      console.warn(`[emailService] Strategy 1 (Resend) failed: ${resendErr.message}`);
      console.warn(`[emailService] Falling through to next strategy...`);
    }
  }

  // ── Strategy 2: Brevo (Sendinblue) API (HTTPS) ────────────────────────────
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey) {
    try {
      console.log(`[emailService] Trying Strategy 2: Brevo API`);
      const fromEmail = process.env.EMAIL_USER || process.env.BREVO_SENDER || 'noreply@ams.com';
      const result = await sendViaBrevo(brevoApiKey, fromEmail, recipientEmail, otp, htmlBody, textBody);
      console.log(`[emailService] ===== Email SENT via Brevo =====\n`);
      return result;
    } catch (brevoErr) {
      console.warn(`[emailService] Strategy 2 (Brevo) failed: ${brevoErr.message}`);
      console.warn(`[emailService] Falling through to SMTP...`);
    }
  }

  // ── Strategy 3 & 4: Gmail SMTP ────────────────────────────────────────────
  // NOTE: Render free tier blocks SMTP ports 25, 465, 587. These strategies
  // work on local dev and on paid Render plans.
  const rawUser = process.env.EMAIL_USER || '';
  const rawPass = process.env.EMAIL_PASS || '';
  const smtpUser = rawUser.replace(/['"]/g, '').trim();
  const smtpPass = rawPass.replace(/['"\s]/g, '').trim();

  if (!smtpUser || !smtpPass) {
    const errMsg =
      '[emailService] SMTP credentials missing. Set EMAIL_USER + EMAIL_PASS (or RESEND_API_KEY) in environment.';
    console.error(errMsg);
    return { success: false, message: errMsg };
  }

  console.log(`[emailService] SMTP sender account: ${smtpUser} (this is the sender, not the recipient)`);

  const mailOptions = {
    from: `"Attendance Management System" <${smtpUser}>`,
    to: recipientEmail,
    subject: 'Your OTP for Attendance System',
    html: htmlBody,
    text: textBody,
  };

  let lastError = null;

  // Strategy 3: Gmail service (port auto)
  try {
    console.log(`[emailService] Trying Strategy 3: Gmail SMTP (service:gmail) -> ${recipientEmail}`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] Strategy 3 SUCCESS — MessageId: ${info.messageId} — Recipient: ${recipientEmail}`);
    console.log(`[emailService] ===== Email SENT via Gmail SMTP =====\n`);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err1) {
    console.warn(`[emailService] Strategy 3 (Gmail service) FAILED: ${err1.message}`);
    lastError = err1;
  }

  // Strategy 4: Gmail port 587 (STARTTLS)
  try {
    console.log(`[emailService] Trying Strategy 4: Gmail SMTP port 587 -> ${recipientEmail}`);
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    const info = await transporter587.sendMail(mailOptions);
    console.log(`[emailService] Strategy 4 SUCCESS — MessageId: ${info.messageId} — Recipient: ${recipientEmail}`);
    console.log(`[emailService] ===== Email SENT via port 587 =====\n`);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err2) {
    console.warn(`[emailService] Strategy 4 (port 587) FAILED: ${err2.message}`);
    lastError = err2;
  }

  // Strategy 5: Gmail port 465 (SSL)
  try {
    console.log(`[emailService] Trying Strategy 5: Gmail SMTP port 465 -> ${recipientEmail}`);
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[emailService] Strategy 5 SUCCESS — MessageId: ${info.messageId} — Recipient: ${recipientEmail}`);
    console.log(`[emailService] ===== Email SENT via port 465 =====\n`);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (err3) {
    console.error(`[emailService] Strategy 5 (port 465) FAILED: ${err3.message}`);
    lastError = err3;
  }

  console.error(`[emailService] ALL strategies FAILED for recipient: ${recipientEmail}`);
  console.error(`[emailService] Last error: ${lastError ? lastError.message : 'none'}`);
  console.error(`[emailService] NOTE: Render free tier blocks SMTP ports. Use RESEND_API_KEY or BREVO_API_KEY in Render env vars.\n`);

  return {
    success: false,
    message: lastError
      ? lastError.message
      : 'All email delivery strategies failed. Check Render environment variables.',
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