/**
 * SMS Service using Fast2SMS
 * Optional integration for sending SMS notifications
 */

const axios = require('axios');

/**
 * Send SMS using Fast2SMS
 * @param {string} phone - Phone number (10 digits, without country code)
 * @param {string} message - Message to send
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendSMS = async (phone, message) => {
  try {
    if (!process.env.FAST2SMS_API_KEY) {
      console.log('⚠️ Fast2SMS API key not set, skipping SMS');
      return { success: false, message: 'SMS API key not configured' };
    }

    if (!phone || phone.length !== 10) {
      return { success: false, message: 'Invalid phone number' };
    }

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      authorization: process.env.FAST2SMS_API_KEY,
      route: 'q',
      message: message,
      language: 'english',
      flash: 0,
      numbers: phone
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.return === true) {
      console.log('✓ SMS sent successfully to:', phone);
      return { success: true, message: 'SMS sent successfully' };
    } else {
      console.error('✗ SMS sending failed:', response.data.message);
      return { success: false, message: response.data.message || 'SMS sending failed' };
    }
  } catch (error) {
    console.error('✗ Failed to send SMS:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send late login alert SMS to admin
 * @param {string} adminPhone - Admin phone number
 * @param {string} employeeName - Employee name
 * @param {string} loginTime - Login time
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLateLoginSMS = async (adminPhone, employeeName, loginTime) => {
  const message = `🚨 Late Login Alert: ${employeeName} logged in at ${loginTime}. Please review attendance.`;
  return sendSMS(adminPhone, message);
};

/**
 * Send leave approval SMS to employee
 * @param {string} employeePhone - Employee phone number
 * @param {string} leaveType - Type of leave
 * @param {string} startDate - Start date
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLeaveApprovalSMS = async (employeePhone, leaveType, startDate) => {
  const message = `✅ Your ${leaveType} leave from ${startDate} has been APPROVED. Have a great time off!`;
  return sendSMS(employeePhone, message);
};

/**
 * Send leave rejection SMS to employee
 * @param {string} employeePhone - Employee phone number
 * @param {string} leaveType - Type of leave
 * @param {string} reason - Rejection reason
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendLeaveRejectionSMS = async (employeePhone, leaveType, reason) => {
  const message = `❌ Your ${leaveType} leave has been REJECTED. Reason: ${reason}. Contact admin for details.`;
  return sendSMS(employeePhone, message);
};

module.exports = {
  sendSMS,
  sendLateLoginSMS,
  sendLeaveApprovalSMS,
  sendLeaveRejectionSMS
};
