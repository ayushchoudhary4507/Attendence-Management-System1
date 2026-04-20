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
