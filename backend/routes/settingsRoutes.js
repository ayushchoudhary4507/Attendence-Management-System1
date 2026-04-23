const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, employee]
 *         department:
 *           type: string
 *         position:
 *           type: string
 *         avatar:
 *           type: string
 *         theme:
 *           type: string
 *           enum: [light, dark]
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: boolean
 *             push:
 *               type: boolean
 *             sms:
 *               type: boolean
 *         language:
 *           type: string
 *           default: en
 *     UserSettings:
 *       type: object
 *       properties:
 *         theme:
 *           type: string
 *           enum: [light, dark, auto]
 *         language:
 *           type: string
 *         timezone:
 *           type: string
 *         dateFormat:
 *           type: string
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: boolean
 *             push:
 *               type: boolean
 *             desktop:
 *               type: boolean
 *     UserNotification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [task, attendance, leave, system, message]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         link:
 *           type: string
 */

/**
 * @swagger
 * /api/settings/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve current user's profile and settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update profile
 *     description: Update user profile information
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Profile'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/settings:
 *   put:
 *     summary: Update settings
 *     description: Update user application settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettings'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/appearance:
 *   put:
 *     summary: Update appearance theme
 *     description: Update user's theme preference
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *     responses:
 *       200:
 *         description: Appearance updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve all notifications for the current user
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserNotification'
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Add notification
 *     description: Create a new notification (Internal use)
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserNotification'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/notifications/read:
 *   put:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     description: Mark all user notifications as read
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/settings/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete a specific notification
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */

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
