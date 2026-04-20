const User = require('../models/User');

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
  try {
    const { name, email, phone, department, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, phone, department, role },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
