const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user profile and settings
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role,
        settings: user.settings,
        notifications: user.notifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  console.log('=== Update Profile Request ===');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('User from auth middleware:', req.user);
  
  try {
    const { name, email, phone, department, role } = req.body;
    let profileImagePath = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    console.log('Updating profile for userId:', req.user?.userId);

    if (!req.user || !req.user.userId) {
      console.error('❌ User not found in request');
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('❌ User not found in database for userId:', req.user.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('Current user data:', {
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      profileImage: user.profileImage
    });

    // Update fields
    if (name) {
      console.log('Updating name:', name);
      user.name = name;
    }
    if (email) {
      console.log('Updating email:', email);
      user.email = email;
    }
    if (phone !== undefined) {
      console.log('Updating phone:', phone);
      user.phone = phone;
    }
    if (department !== undefined) {
      console.log('Updating department:', department);
      user.department = department;
    }
    if (role) {
      console.log('Updating role:', role);
      user.role = role;
    }
    
    // Update profile image if uploaded
    if (profileImagePath) {
      console.log('Updating profile image:', profileImagePath);
      user.profileImage = profileImagePath;
    } else if (req.body.profileImage === '' || req.body.profileImage === null) {
      // User explicitly removed profile image
      console.log('Removing profile image');
      user.profileImage = null;
    }

    await user.save();
    console.log('✅ User saved successfully');

    const responseData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      profileImage: user.profileImage
    };

    console.log('Response data:', responseData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', Object.values(error.errors).map(e => e.message));
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyValue);
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate field value',
        field: Object.keys(error.keyValue)[0]
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile',
      error: error.message 
    });
  }
};

// Export upload middleware for use in routes
exports.upload = upload;

// Update settings (notifications, appearance)
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { settings },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Settings updated successfully', data: user.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update appearance theme
exports.updateAppearance = async (req, res) => {
  try {
    const { theme } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 'settings.appearance.theme': theme },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Theme updated successfully', data: user.settings.appearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Return empty array if notifications field is missing
    const notifications = user.notifications || [];
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add notification
exports.addNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Initialize notifications array if missing
    if (!user.notifications) {
      user.notifications = [];
    }
    const newNotification = {
      id: Date.now(),
      title,
      message,
      type,
      time: 'Just now',
      read: false,
      createdAt: new Date()
    };
    user.notifications.unshift(newNotification);
    await user.save();
    res.json({ success: true, message: 'Notification added', data: newNotification });
  } catch (error) {
    console.error('Add notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Initialize notifications array if missing
    if (!user.notifications) {
      user.notifications = [];
    }
    const notification = user.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await user.save();
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Initialize notifications array if missing
    if (!user.notifications) {
      user.notifications = [];
    }
    user.notifications.forEach(n => n.read = true);
    await user.save();
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Initialize notifications array if missing
    if (!user.notifications) {
      user.notifications = [];
    }
    user.notifications = user.notifications.filter(n => n.id !== parseInt(notificationId));
    await user.save();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
