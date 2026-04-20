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

module.exports = {
  sendOTP,
};
