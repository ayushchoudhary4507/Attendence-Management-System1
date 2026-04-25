const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper: Create notification in DB + emit via socket to admin(s)
const createAndEmitNotification = async (io, notificationData) => {
  try {
    // Find all admin users
    const admins = await User.find({ role: 'admin' }).select('_id');

    const notifications = [];
    for (const admin of admins) {
      const notif = await Notification.create({
        ...notificationData,
        receiverId: admin._id
      });
      notifications.push(notif);

      // Emit to each admin if online
      const onlineUsersMap = io.onlineUsers;
      if (onlineUsersMap) {
        const adminOnline = onlineUsersMap.get(admin._id.toString());
        if (adminOnline && adminOnline.isOnline) {
          io.to(adminOnline.socketId).emit('newNotification', {
            id: notif._id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            senderId: notif.senderId,
            senderName: notif.senderName,
            link: notif.link,
            createdAt: notif.createdAt,
            read: false
          });
          console.log(`📢 Notification emitted to admin ${admin._id}: ${notif.title}`);
        }
      }
    }
    return notifications;
  } catch (error) {
    console.error('Create and emit notification error:', error);
    return [];
  }
};

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private
const createNotification = async (req, res) => {
  try {
    const { type, title, message, employeeId, employeeName, employeeEmail, senderId, senderName, link } = req.body;

    const notification = await Notification.create({
      type,
      title,
      message,
      employeeId,
      employeeName,
      employeeEmail,
      senderId,
      senderName,
      link
    });

    // Emit to admins via socket
    const io = req.app.get('io');
    if (io) {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const onlineUsersMap = io.onlineUsers;
      for (const admin of admins) {
        if (onlineUsersMap) {
          const adminOnline = onlineUsersMap.get(admin._id.toString());
          if (adminOnline && adminOnline.isOnline) {
            io.to(adminOnline.socketId).emit('newNotification', {
              id: notification._id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              senderId: notification.senderId,
              senderName: notification.senderName,
              link: notification.link,
              createdAt: notification.createdAt,
              read: false
            });
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { type, read } = req.query;
    const userId = req.user?.userId || req.userId;

    let filter = {};
    // Admin sees all, employee sees only notifications where they are receiver OR sender
    const user = await User.findById(userId);
    console.log('🔍 Fetching notifications for user:', userId, 'Role:', user?.role);
    
    if (user && user.role !== 'admin') {
      // Support both new receiverId and old userId fields for backward compatibility
      filter.$or = [
        { receiverId: userId },
        { senderId: userId },
        { userId: userId } // Legacy support
      ];
      console.log('🔍 Employee filter:', filter);
    } else {
      console.log('🔍 Admin - fetching all notifications');
    }

    if (type) filter.type = type;
    if (read !== undefined) filter.read = read === 'true';

    console.log('🔍 Final filter:', filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    console.log('📥 Found', notifications.length, 'notifications');
    const unreadCount = await Notification.countDocuments({ ...filter, read: false });
    console.log('📥 Unread count:', unreadCount);

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.userId;
    const user = await User.findById(userId);

    let filter = { read: false };
    if (user && user.role !== 'admin') {
      // Support both new receiverId and old userId fields for backward compatibility
      filter.$or = [
        { receiverId: userId },
        { senderId: userId },
        { userId: userId }
      ];
    }

    const count = await Notification.countDocuments(filter);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.userId;
    const user = await User.findById(userId);

    let filter = { read: false };
    if (user && user.role !== 'admin') {
      // Support both new receiverId and old userId fields for backward compatibility
      filter.$or = [
        { receiverId: userId },
        { senderId: userId },
        { userId: userId }
      ];
    }

    await Notification.updateMany(filter, { read: true });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createAndEmitNotification
};
