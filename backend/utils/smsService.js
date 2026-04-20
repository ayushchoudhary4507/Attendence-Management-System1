const axios = require('axios');

/**
 * Send OTP via SMS using Fast2SMS API
 * @param {string} mobile - Mobile number (10 digits)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendMobileOTP = async (mobile, otp) => {
  try {
    // Validate environment variables
    if (!process.env.FAST2SMS_API_KEY) {
      throw new Error('Fast2SMS API key missing. Please set FAST2SMS_API_KEY in .env file');
    }

    // Validate mobile number
    if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
      throw new Error('Invalid mobile number. Please provide 10 digit mobile number');
    }

    const apiKey = process.env.FAST2SMS_API_KEY;
    
    // Fast2SMS API endpoint
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    
    // Prepare message
    const message = `Your OTP for Attendance System is ${otp}. Valid for 5 minutes. Do not share it with anyone.`;
    
    // Prepare request body
    const params = new URLSearchParams();
    params.append('authorization', apiKey);
    params.append('message', message);
    params.append('language', 'english');
    params.append('route', 't'); // Transactional route for OTP
    params.append('numbers', mobile);

    console.log('Sending SMS to:', mobile);
    
    const response = await axios.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Fast2SMS Response:', response.data);

    // Check if SMS was sent successfully
    if (response.data && response.data.return === true) {
      return {
        success: true,
        message: 'SMS sent successfully',
        data: response.data,
      };
    } else {
      throw new Error(response.data.message || 'Failed to send SMS');
    }

  } catch (error) {
    console.error('✗ Failed to send SMS:', error.message);
    
    // Handle axios errors
    if (error.response) {
      console.error('Fast2SMS Error Response:', error.response.data);
      return {
        success: false,
        message: error.response.data.message || 'SMS service error',
        error: error.response.data,
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to send SMS',
    };
  }
};

/**
 * Alternative: Send OTP using MSG91 API (if Fast2SMS is not available)
 * @param {string} mobile - Mobile number with country code
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendMobileOTP_MSG91 = async (mobile, otp) => {
  try {
    if (!process.env.MSG91_AUTH_KEY) {
      throw new Error('MSG91 Auth key missing. Please set MSG91_AUTH_KEY in .env file');
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    
    // MSG91 API endpoint
    const url = `https://control.msg91.com/api/v5/otp`;
    
    const payload = {
      template_id: templateId,
      short_url: '0',
      recipients: [
        {
          mobiles: `91${mobile}`,
          var1: otp,
        },
      ],
    };

    console.log('Sending SMS via MSG91 to:', mobile);

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey,
      },
    });

    console.log('MSG91 Response:', response.data);

    if (response.data && response.data.type === 'success') {
      return {
        success: true,
        message: 'SMS sent successfully',
        data: response.data,
      };
    } else {
      throw new Error(response.data.message || 'Failed to send SMS');
    }

  } catch (error) {
    console.error('✗ Failed to send SMS via MSG91:', error.message);
    
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'SMS service error',
        error: error.response.data,
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to send SMS',
    };
  }
};

module.exports = {
  sendMobileOTP,
  sendMobileOTP_MSG91,
};
