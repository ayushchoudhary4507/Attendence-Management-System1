const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get user profile and settings
router.get('/profile', authMiddleware, settingsController.getProfile);

// Update profile
router.put('/profile', authMiddleware, settingsController.updateProfile);

// Update settings
router.put('/settings', authMiddleware, settingsController.updateSettings);

// Update appearance theme
router.put('/appearance', authMiddleware, settingsController.updateAppearance);

// Get notifications
router.get('/notifications', authMiddleware, settingsController.getNotifications);

// Add notification
router.post('/notifications', authMiddleware, settingsController.addNotification);

// Mark notification as read
router.put('/notifications/read', authMiddleware, settingsController.markNotificationRead);

// Mark all notifications as read
router.put('/notifications/read-all', authMiddleware, settingsController.markAllNotificationsRead);

// Delete notification
router.delete('/notifications/:notificationId', authMiddleware, settingsController.deleteNotification);

module.exports = router;
