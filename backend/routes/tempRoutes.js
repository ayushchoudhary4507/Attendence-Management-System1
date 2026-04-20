const express = require('express');
const router = express.Router();
const User = require('../models/User');

// TEMPORARY: Promote user to admin (for setup only)
router.post('/make-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Simple security - only works with secret key
    if (secretKey !== 'setup123') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }
    
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User promoted to admin',
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
