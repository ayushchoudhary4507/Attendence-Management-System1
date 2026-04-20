const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if it's a Gmail address
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ 
        success: false,
        message: 'Please use a Gmail address (@gmail.com)',
        popup: {
          type: 'error',
          title: 'Invalid Email',
          message: 'Only Gmail addresses are allowed'
        }
      });
    }

    console.log('Looking for user:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found in database');
      return res.status(400).json({ 
        success: false,
        message: 'Account not found. Please signup first.',
        popup: {
          type: 'error',
          title: 'Account Not Found',
          message: 'This email is not registered. Please contact admin.'
        }
      });
    }

    console.log('User found:', user.email, 'Role:', user.role);
    console.log('Comparing passwords with base64...');
    
    // Use base64 comparison to avoid bcrypt issues
    const hashedInput = Buffer.from(password).toString('base64');
    const isMatch = (hashedInput === user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials',
        popup: {
          type: 'error',
          title: 'Login Failed',
          message: 'Incorrect password. Please try again.'
        }
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ User logged in successfully from database:', email, 'Role:', user.role);

    // Find corresponding employee record by email for messaging
    const employee = await Employee.findOne({ email: user.email });
    const employeeId = employee ? employee._id.toString() : null;

    // Role-based response
    let responseMessage = 'Login successful';
    let popupType = 'success';
    let popupTitle = 'Welcome Back!';
    let popupMessage = '';
    let permissions = [];

    if (user.role === 'admin') {
      responseMessage = 'Admin login successful';
      popupTitle = 'Welcome Admin!';
      popupMessage = 'You have full access to create, read, update, and delete data.';
      permissions = ['create', 'read', 'update', 'delete'];
    } else {
      // employee role
      popupTitle = 'Welcome Employee!';
      popupMessage = 'You have view-only access to data.';
      permissions = ['read'];
    }

    res.json({
      success: true,
      message: responseMessage,
      token,
      user: {
        id: user._id,
        employeeId: employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissions
      },
      popup: {
        type: popupType,
        title: popupTitle,
        message: popupMessage
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message,
      error: error.message,
      popup: {
        type: 'error',
        title: 'Server Error',
        message: 'Something went wrong. Please try again later.'
      }
    });
  }
};

// Admin Login - Only allows users with role 'admin'
const adminLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Admin login attempt:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('User is not an admin');
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Verify password
    const hashedInput = Buffer.from(password).toString('base64');
    const isMatch = (hashedInput === user.password);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Admin logged in successfully:', email);

    // Find corresponding employee record by email for messaging
    const employee = await Employee.findOne({ email: user.email });
    const employeeId = employee ? employee._id.toString() : null;

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        employeeId: employeeId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { loginController, adminLoginController };
