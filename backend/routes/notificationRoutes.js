const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerDevice,
  unregisterDevice
} = require('../controllers/notificationController');

// All routes are protected
router.use(protect);

// Create notification (any authenticated user)
router.post('/', createNotification);

// Get notifications (all users - controller filters by role)
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// FCM Device Token Management
// POST  /api/notifications/register-device   — save FCM token after login
// DELETE /api/notifications/unregister-device — remove FCM token on logout (body OR query ?token=)
router.post('/register-device', registerDevice);
router.delete('/unregister-device', unregisterDevice);
// Also support POST for clients that can't send DELETE with body
router.post('/unregister-device', unregisterDevice);

module.exports = router;
