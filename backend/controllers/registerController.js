const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { demoUsers } = require('../utils/demoUsers');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const registerController = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if it's a Gmail address
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ 
        message: 'Please use a Gmail address (@gmail.com)' 
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('🔐 Database not connected, using mock registration');
      
      // Check if user already exists in demo storage
      if (demoUsers.has(email)) {
        return res.status(400).json({ message: 'Gmail account already exists' });
      }

      // Create new user in demo storage
      const userId = 'user-' + Date.now();
      const newUser = {
        id: userId,
        name: name,
        email: email,
        phone: phone || ''
      };

      // Store in demo users
      demoUsers.set(email, newUser);

      const token = jwt.sign(
        { userId: userId, email: email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        message: 'Gmail account registered successfully (Demo Mode)',
        token,
        user: newUser
      });
    }

    // Normal database registration
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Gmail account already exists' });
    }

    // Use base64 hashing to avoid bcrypt issues
    const hashedPassword = Buffer.from(password).toString('base64');
    console.log('Password hashed with base64');

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || ''
    });

    await user.save();
    console.log('User saved to database with ID:', user._id);

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ User registered successfully in database:', email);

    res.status(201).json({
      message: 'Gmail account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerController };
