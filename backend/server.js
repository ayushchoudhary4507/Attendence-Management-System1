const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('node:dns');
const Message = require('./models/Message');
const Group = require('./models/Group');

// Set DNS servers for better Atlas connectivity
dns.setServers(['8.8.8.8', '8.8.4.4',]);

// Connect to database
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';
    console.log('🔗 MongoDB URI:', mongoUri ? 'Set' : 'Not set');
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Please ensure MongoDB is running and MONGODB_URI is set in .env file');
    // Don't exit process, allow server to start without DB for testing
    console.warn('⚠️  Server will start without database connection');
  }
};
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
});

// Attach io to app for access in routes
app.set('io', io);
const PORT = process.env.PORT || 5005;

// Middleware - Allow all origins for CORS   
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json());

// Serve uploaded files statically
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Attendence Management Systemnn1',
      version: '1.0.0',
      description: 'API documentation for the Attendence Management System backend',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5005}`,
        description: 'Local server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Import routes
const { loginController, adminLoginController } = require('./controllers/loginController');
const { registerController } = require('./controllers/registerController');
const loginRoutes = require('./routes/loginRoutes');
const registerRoutes = require('./routes/registerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const projectRoutes = require('./routes/projectRoutes');
const otpRoutes = require('./routes/otpRoutes');
const publicRoutes = require('./routes/publicRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const advancedReportRoutes = require('./routes/advancedReportRoutes');

// Use routes
app.use('/api/login', loginRoutes);
app.post('/api/admin/login', adminLoginController);
app.use('/api/register', registerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', otpRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payslip', payslipRoutes);
app.use('/api/advanced-reports', advancedReportRoutes);

// Socket.io real-time messaging
const onlineUsers = new Map(); // userId -> { socketId, lastSeen }
const typingUsers = new Map(); // userId -> { receiverId, timeout }

// Expose io globally so controllers can emit notifications
global._io = io;
io.onlineUsers = onlineUsers;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their userId
  socket.on('join', async (userId) => {
    if (userId) {
      socket.userId = userId;
      onlineUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
        isOnline: true
      });
      console.log(`User ${userId} joined with socket ${socket.id}`);
      
      // Broadcast online status to all users
      io.emit('user_status', {
        userId: userId,
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Send current online users list to the new user
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('online_users', onlineUserIds);
      
      // Auto-join all groups that the user is a member of
      try {
        const userGroups = await Group.find({ 'members.userId': userId }).select('_id');
        userGroups.forEach(group => {
          socket.join(`group:${group._id}`);
          console.log(`User ${userId} auto-joined group:${group._id}`);
        });
        console.log(`User ${userId} auto-joined ${userGroups.length} groups`);
      } catch (err) {
        console.error('Error auto-joining groups:', err);
      }
    }
  });

  // Handle private message
  socket.on('send_message', async (data) => {
    const { id, tempId, receiverId, message, senderId, senderName, timestamp } = data;
    
    console.log(`Socket message from ${senderId} to ${receiverId}: ${message}`);
    
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
        console.error('Invalid senderId or receiverId');
        socket.emit('message_error', { error: 'Invalid user IDs' });
        return;
      }

      // The message should already be saved to DB via API
      // We just need to broadcast it to the receiver
      const messageData = {
        id: id || tempId,
        tempId: tempId,
        senderId,
        senderName,
        receiverId,
        message,
        timestamp: timestamp || new Date(),
        read: false
      };
      
      // Emit to receiver if online
      const receiver = onlineUsers.get(receiverId);
      if (receiver && receiver.isOnline) {
        io.to(receiver.socketId).emit('receive_message', messageData);
        console.log(`Message delivered to receiver ${receiverId}`);

        // Also send notification to receiver with receiverId for filtering
        io.to(receiver.socketId).emit('newNotification', {
          id: Date.now(),
          type: 'message',
          title: `New message from ${senderName}`,
          message: message.length > 50 ? message.substring(0, 50) + '...' : message,
          senderId,
          senderName,
          receiverId, // Include receiverId so frontend can verify
          createdAt: new Date()
        });
        console.log(`Message notification sent to receiver ${receiverId}`);
      } else {
        console.log(`Receiver ${receiverId} not online, notification not sent`);
      }

      // Confirm to sender
      socket.emit('message_sent', {
        ...messageData,
        status: 'sent'
      });
    } catch (error) {
      console.error('Error handling socket message:', error);
      socket.emit('message_error', {
        error: 'Failed to send message',
        originalData: data
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    const senderId = socket.userId;
    
    if (!senderId) return;
    
    const receiver = onlineUsers.get(receiverId);
    if (receiver && receiver.isOnline) {
      io.to(receiver.socketId).emit('typing', {
        userId: senderId,
        isTyping
      });
    }
    
    // Clear previous timeout if exists
    const existingTimeout = typingUsers.get(senderId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to stop typing after 3 seconds
    if (isTyping) {
      const timeout = setTimeout(() => {
        typingUsers.delete(senderId);
        if (receiver && receiver.isOnline) {
          io.to(receiver.socketId).emit('typing', {
            userId: senderId,
            isTyping: false
          });
        }
      }, 3000);
      typingUsers.set(senderId, timeout);
    }
  });

  // Handle message read receipt
  socket.on('mark_read', (data) => {
    const { messageId, senderId } = data;
    const receiverId = socket.userId;
    
    if (!receiverId) return;
    
    // Notify sender that message was read
    const sender = onlineUsers.get(senderId);
    if (sender && sender.isOnline) {
      io.to(sender.socketId).emit('message_read', {
        messageId,
        readBy: receiverId,
        readAt: new Date()
      });
    }
  });

  // ==================== GROUP CHAT SOCKET HANDLERS ====================
  
  // Join group room
  socket.on('join_group', (groupId) => {
    if (!socket.userId) return;
    
    socket.join(`group:${groupId}`);
    console.log(`User ${socket.userId} joined group room: group:${groupId}`);
    
    // Notify other group members
    socket.to(`group:${groupId}`).emit('user_joined_group', {
      groupId,
      userId: socket.userId
    });
  });

  // Leave group room
  socket.on('leave_group', (groupId) => {
    if (!socket.userId) return;
    
    socket.leave(`group:${groupId}`);
    console.log(`User ${socket.userId} left group room: group:${groupId}`);
  });

  // Handle group message
  socket.on('send_group_message', async (data) => {
    const { id, tempId, groupId, message, senderId, senderName, timestamp, messageType } = data;
    
    console.log(`Socket group message from ${senderId} to group ${groupId}: ${message}`);
    
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(groupId)) {
        console.error('Invalid senderId or groupId');
        socket.emit('message_error', { error: 'Invalid IDs' });
        return;
      }

      const messageData = {
        id: id || tempId,
        tempId: tempId,
        groupId,
        senderId,
        senderName,
        message,
        messageType: messageType || 'text',
        timestamp: timestamp || new Date(),
        read: false
      };
      
      // Broadcast to all members in the group room (including sender for confirmation)
      io.to(`group:${groupId}`).emit('receive_group_message', messageData);
      console.log(`Group message broadcasted to group:${groupId}`);

      // Send notification to online group members (except sender)
      const Group = require('./models/Group');
      try {
        const group = await Group.findById(groupId);
        if (group && group.members) {
          group.members.forEach(member => {
            const memberId = member.userId?.toString() || member.toString();
            if (memberId !== senderId) {
              const memberOnline = onlineUsers.get(memberId);
              if (memberOnline && memberOnline.isOnline) {
                io.to(memberOnline.socketId).emit('newNotification', {
                  id: Date.now(),
                  type: 'message',
                  title: `${senderName} in ${group.name || 'Group'}`,
                  message: message.length > 50 ? message.substring(0, 50) + '...' : message,
                  groupId,
                  senderId,
                  senderName,
                  createdAt: new Date()
                });
              }
            }
          });
        }
      } catch (err) {
        console.log('Group notification error (non-critical):', err.message);
      }

      // Confirm to sender
      socket.emit('group_message_sent', {
        ...messageData,
        status: 'sent'
      });

      // Emit sidebar update event to all group members
      const lastMessageData = {
        groupId,
        lastMessage: {
          message: message,
          senderId: { name: senderName },
          timestamp: timestamp || new Date()
        }
      };
      io.to(`group:${groupId}`).emit('group_last_message_updated', lastMessageData);
      console.log(`Group last message updated broadcasted to group:${groupId}`);
    } catch (error) {
      console.error('Error handling group socket message:', error);
      socket.emit('message_error', {
        error: 'Failed to send group message',
        originalData: data
      });
    }
  });

  // Handle group typing indicator
  socket.on('group_typing', (data) => {
    const { groupId, isTyping } = data;
    const senderId = socket.userId;
    
    if (!senderId) return;
    
    // Broadcast typing status to all group members except sender
    socket.to(`group:${groupId}`).emit('group_typing', {
      groupId,
      userId: senderId,
      isTyping
    });
    
    // Clear previous timeout if exists
    const typingKey = `group:${groupId}:${senderId}`;
    const existingTimeout = typingUsers.get(typingKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to stop typing after 3 seconds
    if (isTyping) {
      const timeout = setTimeout(() => {
        typingUsers.delete(typingKey);
        socket.to(`group:${groupId}`).emit('group_typing', {
          groupId,
          userId: senderId,
          isTyping: false
        });
      }, 3000);
      typingUsers.set(typingKey, timeout);
    }
  });

  // Handle group message read receipt
  socket.on('group_message_read', (data) => {
    const { groupId, messageId, senderId } = data;
    const readerId = socket.userId;
    
    if (!readerId || !groupId) return;
    
    console.log(`Group message read: ${messageId} in group ${groupId} by ${readerId}`);
    
    // Notify the sender that their message was read
    if (senderId && senderId !== readerId) {
      const sender = onlineUsers.get(senderId);
      if (sender && sender.isOnline) {
        io.to(sender.socketId).emit('group_message_read', {
          messageId,
          groupId,
          readBy: readerId,
          readAt: new Date()
        });
      }
    }
    
    // Also broadcast to group room so all members can update read status if needed
    socket.to(`group:${groupId}`).emit('group_message_read', {
      messageId,
      groupId,
      readBy: readerId,
      readAt: new Date()
    });
  });

  // ==================== NOTIFICATION SOCKET HANDLERS ====================

  // Send notification to specific user
  socket.on('send_notification', (data) => {
    const { userId, notification } = data;

    if (!userId || !notification) {
      console.error('Invalid notification data:', data);
      return;
    }

    const targetUser = onlineUsers.get(userId);
    if (targetUser && targetUser.isOnline) {
      // Emit both event names for compatibility
      io.to(targetUser.socketId).emit('newNotification', notification);
      io.to(targetUser.socketId).emit('receive_notification', { userId, notification });
      console.log(`Notification sent to user ${userId}:`, notification.title);
    }
  });

  // Helper: Create and send notification to a user (server-side use)
  socket.on('create_notification', async (data) => {
    const { userId, title, message, type } = data;

    if (!userId || !title || !message) {
      console.error('Invalid create_notification data:', data);
      return;
    }

    try {
      const User = require('./models/User');
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for notification:', userId);
        return;
      }

      const newNotification = {
        id: Date.now(),
        title,
        message,
        type: type || 'update',
        time: 'Just now',
        read: false,
        createdAt: new Date()
      };

      if (!user.notifications) {
        user.notifications = [];
      }
      user.notifications.unshift(newNotification);
      await user.save();

      // Emit to user if online
      const targetUser = onlineUsers.get(userId);
      if (targetUser && targetUser.isOnline) {
        io.to(targetUser.socketId).emit('newNotification', newNotification);
        io.to(targetUser.socketId).emit('receive_notification', { userId, notification: newNotification });
        console.log(`Notification created and sent to user ${userId}:`, title);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      // Update online status
      const userData = onlineUsers.get(socket.userId);
      if (userData) {
        userData.isOnline = false;
        userData.lastSeen = new Date();
        
        // Keep in onlineUsers for a while to show "last seen"
        setTimeout(() => {
          if (onlineUsers.has(socket.userId) && !onlineUsers.get(socket.userId).isOnline) {
            onlineUsers.delete(socket.userId);
          }
        }, 60000); // Remove after 1 minute
      }
      
      // Broadcast offline status
      io.emit('user_status', {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date()
      });
      
      // Clear typing status
      const typingTimeout = typingUsers.get(socket.userId);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingUsers.delete(socket.userId);
      }
    }
  });
});

// ==================== CRON JOB: Auto Salary Calculation ====================
// Runs on the 1st of every month at 1:00 AM
try {
  const cron = require('node-cron');
  const { bulkCalculateSalary } = require('./controllers/salaryController');

  cron.schedule('0 1 1 * *', async () => {
    console.log('⏰ Cron: Auto-calculating salaries for previous month...');
    try {
      const now = new Date();
      const prevMonth = now.getMonth(); // 0-indexed (current month - 1 = previous month)
      const prevYear = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = prevMonth === 0 ? 12 : prevMonth;
      const results = await bulkCalculateSalary(month, prevYear, null);
      console.log(`✅ Cron: Auto-calculated salary for ${results.length} employees`);
    } catch (err) {
      console.error('❌ Cron: Error in auto salary calculation:', err.message);
    }
  });
  console.log('✅ Cron job registered: Auto salary calculation on 1st of each month at 1 AM');
} catch (err) {
  console.warn('⚠️ node-cron not installed. Auto salary calculation disabled. Install with: npm install node-cron');
}

// 404 handler - catches all unmatched routes
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: 'Route not found' });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
