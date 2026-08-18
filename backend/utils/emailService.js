const nodemailer = require('nodemailer');

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendOTP = async (email, otp) => {
  try {
    const rawUser = process.env.EMAIL_USER || '';
    const rawPass = process.env.EMAIL_PASS || '';

    const user = rawUser.replace(/['"]+/g, '').trim();
    const pass = rawPass.replace(/['"\s]+/g, '').trim();

    if (!user || !pass) {
      const errMsg = 'Email configuration missing in environment. EMAIL_USER=' + (user ? ('Set (' + user + ')') : 'Missing') + ', EMAIL_PASS=' + (pass ? ('Set (' + pass.length + ' chars)') : 'Missing');
      console.error('[EMAIL OTP ERROR]:', errMsg);
      return { success: false, message: errMsg };
    }

    const mailOptions = {
      from: '"Attendance System" <' + user + '>',
      to: email.trim(),
      subject: 'Your OTP for Attendance System: ' + otp,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; margin-bottom: 20px;">Attendance System</h2>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Your One-Time Password (OTP) for password reset / login is:
            </p>
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't request this OTP, please ignore this email.<br>
              &copy; ${new Date().getFullYear()} Attendance System. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: 'Your OTP for Attendance System is: ' + otp + '\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.\n\nIf you didn\'t request this OTP, please ignore this email.',
    };

    let lastError = null;

    // Strategy 1: nodemailer service 'gmail'
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL SUCCESS via service:gmail]: MessageId:', info.messageId);
      return { success: true, message: 'OTP email sent successfully' };
    } catch (err1) {
      console.warn('⚠️ [EMAIL Strategy 1 failed]:', err1.message);
      lastError = err1;
    }

    // Strategy 2: smtp.gmail.com port 587 STARTTLS
    try {
      const transporter587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      const info = await transporter587.sendMail(mailOptions);
      console.log('✅ [EMAIL SUCCESS via port 587]: MessageId:', info.messageId);
      return { success: true, message: 'OTP email sent successfully' };
    } catch (err2) {
      console.warn('⚠️ [EMAIL Strategy 2 failed]:', err2.message);
      lastError = err2;
    }

    // Strategy 3: smtp.gmail.com port 465 SSL
    try {
      const transporter465 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      const info = await transporter465.sendMail(mailOptions);
      console.log('✅ [EMAIL SUCCESS via port 465]: MessageId:', info.messageId);
      return { success: true, message: 'OTP email sent successfully' };
    } catch (err3) {
      console.error('❌ [EMAIL Strategy 3 failed]:', err3.message);
      lastError = err3;
    }

    return {
      success: false,
      message: lastError ? lastError.message : 'Failed to send email through all strategies'
    };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to send OTP email',
    };
  }
};

/**
 * Send late login alert email to admin
 * @param {string} adminEmail - Admin email address
 * @param {string} employeeName - Name of employee who logged in late
 * @param {string} employeeEmail - Email of employee
 * @param {string} loginTime - Time of late login
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLateLoginAlert = async (adminEmail, employeeName, employeeEmail, loginTime) => {
  try {
    const user = (process.env.EMAIL_USER || '').replace(/['"]+/g, '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/['"\s]+/g, '').trim();
    if (!user || !pass) {
      return { success: false, message: 'Email credentials missing' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: '"Attendance System" <' + user + '>',
      to: adminEmail,
      subject: 'Late Login Alert - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #B45309; margin: 0; font-size: 20px;">Late Login Alert</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Employee <strong>${employeeName}</strong> logged in late today.
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Employee Name:</strong> ${employeeName}</p>
              <p style="margin: 8px 0;"><strong>Employee Email:</strong> ${employeeEmail}</p>
              <p style="margin: 8px 0;"><strong>Login Time:</strong> ${loginTime}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      `,
      text: 'Late Login Alert\n\nEmployee: ' + employeeName + '\nEmail: ' + employeeEmail + '\nLogin Time: ' + loginTime,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: 'Late login alert email sent successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Send leave approval email to employee
 */
const sendLeaveApprovalEmail = async (employeeEmail, employeeName, leaveType, startDate, endDate) => {
  try {
    const user = (process.env.EMAIL_USER || '').replace(/['"]+/g, '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/['"\s]+/g, '').trim();
    if (!user || !pass) return { success: false, message: 'Email credentials missing' };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: '"Attendance System" <' + user + '>',
      to: employeeEmail,
      subject: 'Leave Approved - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #10B981; margin: 0; font-size: 20px;">Leave Approved</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">Dear ${employeeName},</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">Your leave request has been approved:</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
              <p style="margin: 8px 0;"><strong>Start Date:</strong> ${startDate}</p>
              <p style="margin: 8px 0;"><strong>End Date:</strong> ${endDate}</p>
            </div>
          </div>
        </div>
      `,
      text: 'Leave Approved\n\nDear ' + employeeName + ',\n\nYour leave request has been approved: ' + leaveType + ' from ' + startDate + ' to ' + endDate,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: 'Leave approval email sent successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Send leave rejection email to employee
 */
const sendLeaveRejectionEmail = async (employeeEmail, employeeName, leaveType, rejectionReason) => {
  try {
    const user = (process.env.EMAIL_USER || '').replace(/['"]+/g, '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/['"\s]+/g, '').trim();
    if (!user || !pass) return { success: false, message: 'Email credentials missing' };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: '"Attendance System" <' + user + '>',
      to: employeeEmail,
      subject: 'Leave Rejected - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #EF4444; margin: 0; font-size: 20px;">Leave Rejected</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">Dear ${employeeName},</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">Your leave request has been rejected:</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
              <p style="margin: 8px 0;"><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
            </div>
          </div>
        </div>
      `,
      text: 'Leave Rejected\n\nDear ' + employeeName + ',\n\nYour leave request has been rejected: ' + (rejectionReason || 'No reason provided'),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: 'Leave rejection email sent successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendOTP,
  sendLateLoginAlert,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
};
