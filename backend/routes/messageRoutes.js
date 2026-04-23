const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/adminMiddleware');
const {
  getUsers,
  getMessages,
  sendMessage,
  getUnreadCount,
  getConversations,
  markAsRead
} = require('../controllers/messageController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         sender:
 *           type: string
 *           description: Sender user ID
 *         receiver:
 *           type: string
 *           description: Receiver user ID
 *         content:
 *           type: string
 *           description: Message content
 *         fileUrl:
 *           type: string
 *           description: Attached file URL
 *         fileName:
 *           type: string
 *         fileType:
 *           type: string
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Conversation:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 */

/**
 * @swagger
 * /api/messages/users:
 *   get:
 *     summary: Get all users for chat
 *     description: Retrieve all users available for messaging
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get conversations
 *     description: Get list of all conversations with last message and unread count
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     description: Get total count of unread messages
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/messages/{userId}:
 *   get:
 *     summary: Get messages with user
 *     description: Retrieve chat history with a specific user
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get messages with
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send message
 *     description: Send a message to another user
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: Receiver user ID
 *               content:
 *                 type: string
 *                 description: Message text
 *               fileUrl:
 *                 type: string
 *                 description: Optional file attachment URL
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/messages/read/{userId}:
 *   put:
 *     summary: Mark messages as read
 *     description: Mark all messages from a user as read
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to mark messages from
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/messages/upload:
 *   post:
 *     summary: Upload file
 *     description: Upload a file for message attachment (Max 10MB)
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 fileUrl:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 fileType:
 *                   type: string
 *                 size:
 *                   type: integer
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    // Accept all files
    cb(null, true);
  }
});

// Debug: Log all message route requests
router.use((req, res, next) => {
  console.log(`📨 Message Route: ${req.method} ${req.path}`);
  next();
});

// All routes require authentication
router.use(authMiddleware);

// Get all users (for chat list)
router.get('/users', getUsers);

// Get conversations list
router.get('/conversations', getConversations);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Get chat history with a specific user
router.get('/:userId', getMessages);

// Send a message
router.post('/', sendMessage);

// Mark all messages from a user as read
router.put('/read/:userId', markAsRead);

// Upload file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

// Debug: Catch all unmatched routes in this router
router.use((req, res) => {
  console.log('❌ 404 in messageRoutes:', req.method, req.path);
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

module.exports = router;
