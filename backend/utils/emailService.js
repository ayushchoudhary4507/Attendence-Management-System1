const nodemailer = require('nodemailer');

/**
 * Create a secure transporter using Gmail SMTP
 */
const createTransporter = () => {
  console.log('Creating email transporter...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'NOT SET');
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendOTP = async (email, otp) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in .env file');
    }

    const transporter = createTransporter();
    
    // Verify transporter configuration
    console.log('Verifying email transporter...');
    await transporter.verify();
    console.log('Transporter verified successfully');

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP for Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; margin-bottom: 20px;">Attendance System</h2>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Your One-Time Password (OTP) for login is:
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
      text: `Your OTP for Attendance System is: ${otp}\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.\n\nIf you didn't request this OTP, please ignore this email.`,
    };

    console.log('Sending email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully! MessageId:', info.messageId);
    
    return {
      success: true,
      message: 'OTP email sent successfully',
    };
  } catch (error) {
    console.error('✗ Failed to send OTP email:', error.message);
    console.error('Full error:', error);
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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in .env file');
    }

    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: '🚨 Late Login Alert - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #EF4444; margin: 0; font-size: 20px;">⚠️ Late Login Alert</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              An employee has logged in late today:
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Employee Name:</strong> ${employeeName}</p>
              <p style="margin: 8px 0;"><strong>Employee Email:</strong> ${employeeEmail}</p>
              <p style="margin: 8px 0;"><strong>Login Time:</strong> ${loginTime}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Please review this employee's attendance record.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated notification from the Attendance System.<br>
              &copy; ${new Date().getFullYear()} Attendance System. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Late Login Alert\n\nEmployee: ${employeeName}\nEmail: ${employeeEmail}\nLogin Time: ${loginTime}\nDate: ${new Date().toLocaleDateString()}\n\nPlease review this employee's attendance record.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Late login alert email sent to admin:', adminEmail, 'MessageId:', info.messageId);
    
    return { success: true, message: 'Late login alert email sent successfully' };
  } catch (error) {
    console.error('✗ Failed to send late login alert email:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send leave approval email to employee
 * @param {string} employeeEmail - Employee email address
 * @param {string} employeeName - Employee name
 * @param {string} leaveType - Type of leave (sick, casual, etc.)
 * @param {string} startDate - Leave start date
 * @param {string} endDate - Leave end date
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLeaveApprovalEmail = async (employeeEmail, employeeName, leaveType, startDate, endDate) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in .env file');
    }

    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: employeeEmail,
      subject: '✅ Leave Approved - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #10B981; margin: 0; font-size: 20px;">✅ Leave Approved</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Dear ${employeeName},
            </p>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Your leave request has been approved:
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
              <p style="margin: 8px 0;"><strong>Start Date:</strong> ${startDate}</p>
              <p style="margin: 8px 0;"><strong>End Date:</strong> ${endDate}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Have a great time off!
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated notification from the Attendance System.<br>
              &copy; ${new Date().getFullYear()} Attendance System. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Leave Approved\n\nDear ${employeeName},\n\nYour leave request has been approved:\n\nLeave Type: ${leaveType}\nStart Date: ${startDate}\nEnd Date: ${endDate}\n\nHave a great time off!`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Leave approval email sent to:', employeeEmail, 'MessageId:', info.messageId);
    
    return { success: true, message: 'Leave approval email sent successfully' };
  } catch (error) {
    console.error('✗ Failed to send leave approval email:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send leave rejection email to employee
 * @param {string} employeeEmail - Employee email address
 * @param {string} employeeName - Employee name
 * @param {string} leaveType - Type of leave (sick, casual, etc.)
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLeaveRejectionEmail = async (employeeEmail, employeeName, leaveType, rejectionReason) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in .env file');
    }

    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: employeeEmail,
      subject: '❌ Leave Rejected - Attendance System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h2 style="color: #EF4444; margin: 0; font-size: 20px;">❌ Leave Rejected</h2>
            </div>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Dear ${employeeName},
            </p>
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Your leave request has been rejected:
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
              <p style="margin: 8px 0;"><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you have any questions, please contact your admin.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated notification from the Attendance System.<br>
              &copy; ${new Date().getFullYear()} Attendance System. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Leave Rejected\n\nDear ${employeeName},\n\nYour leave request has been rejected:\n\nLeave Type: ${leaveType}\nReason: ${rejectionReason || 'No reason provided'}\n\nIf you have any questions, please contact your admin.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Leave rejection email sent to:', employeeEmail, 'MessageId:', info.messageId);
    
    return { success: true, message: 'Leave rejection email sent successfully' };
  } catch (error) {
    console.error('✗ Failed to send leave rejection email:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendOTP,
  sendLateLoginAlert,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
};
