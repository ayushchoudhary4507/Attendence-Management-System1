const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

// All routes are protected
router.use(protect);

// Create notification (any authenticated user)
router.post('/', createNotification);

// Admin only routes
router.get('/', admin, getNotifications);
router.get('/unread-count', admin, getUnreadCount);
router.put('/:id/read', admin, markAsRead);
router.put('/mark-all-read', admin, markAllAsRead);
router.delete('/:id', admin, deleteNotification);

module.exports = router;
