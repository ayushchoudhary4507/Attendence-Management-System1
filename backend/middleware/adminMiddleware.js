const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token and check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.', error: error.message });
  }
};

// Middleware to verify token only (for both admin and user)
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('AuthMiddleware - No token provided for:', req.method, req.originalUrl);
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('AuthMiddleware - Token decoded for userId:', decoded.userId);

    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('AuthMiddleware - User not found for userId:', decoded.userId);
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error('AuthMiddleware - Error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.', error: error.message });
    }
    res.status(401).json({ message: 'Invalid token.', error: error.message });
  }
};

// Middleware to check role
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found.' });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
      }

      req.user = user;
      req.userId = user._id;

      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token.', error: error.message });
    }
  };
};

module.exports = {
  adminMiddleware,
  authMiddleware,
  checkRole
};
