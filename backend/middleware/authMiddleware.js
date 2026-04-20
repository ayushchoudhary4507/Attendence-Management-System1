const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('AuthMiddleware - Token received:', token ? 'Yes (length: ' + token.length + ')' : 'No');
    console.log('AuthMiddleware - JWT_SECRET set:', process.env.JWT_SECRET ? 'Yes' : 'No (using fallback)');
    
    if (!token) {
      console.log('AuthMiddleware - No token provided');
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('AuthMiddleware - Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('AuthMiddleware - Token verification failed:', error.message);
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Protect middleware (same as authMiddleware)
const protect = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Admin middleware - check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { authMiddleware, protect, admin };
