const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const Employee = require('../models/Employee');

// Get all users (except the current user)
const getUsers = async (req, res) => {
  try {
    const currentUserIdRaw = req.userId || req.user?._id || req.user?.id;
    const currentUserIdStr = currentUserIdRaw?.toString();

    if (!currentUserIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Get all users except the current user, exclude password field
    const users = await User.find(
      { _id: { $ne: currentUserIdStr } },
      { password: 0 }
    ).select('name email role department phone profileImage');

    // Fetch employee photos map as fallback
    const employees = await Employee.find({}, 'email name profileImage');
    const empImageMap = new Map();
    employees.forEach(emp => {
      if (emp.profileImage && emp.profileImage.trim() !== '') {
        if (emp.email) empImageMap.set(emp.email.toLowerCase(), emp.profileImage);
        if (emp.name) empImageMap.set(emp.name.toLowerCase(), emp.profileImage);
      }
    });

    res.status(200).json({
      success: true,
      users: users.map(user => {
        const empPhoto = empImageMap.get(user.email?.toLowerCase()) || empImageMap.get(user.name?.toLowerCase());
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          phone: user.phone,
          profileImage: user.profileImage || empPhoto || ''
        };
      })
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get chat history between current user and another user
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    // Get current user ID and convert to string if it's an ObjectId
    const currentUserIdRaw = req.userId || req.user?._id || req.user?.id;
    const currentUserIdStr = currentUserIdRaw?.toString();

    if (!currentUserIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserIdStr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid current user ID'
      });
    }

    const currentUserId = new mongoose.Types.ObjectId(currentUserIdStr);
    const otherUserId = new mongoose.Types.ObjectId(userId);

    // Find all messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('senderId', 'name email')
    .populate('receiverId', 'name email');

    // Mark unread messages as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      messages: messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId?._id || msg.senderId,
        senderName: msg.senderId?.name || 'Unknown User',
        senderEmail: msg.senderId?.email || '',
        receiverId: msg.receiverId?._id || msg.receiverId,
        receiverName: msg.receiverId?.name || 'Unknown User',
        message: msg.message,
        messageType: msg.messageType || (msg.fileUrl ? (msg.fileType?.startsWith('image/') ? 'image' : 'file') : 'text'),
        fileUrl: msg.fileUrl || null,
        fileName: msg.fileName || null,
        fileType: msg.fileType || null,
        timestamp: (msg.timestamp || msg.createdAt || new Date()).toISOString(),
        createdAt: (msg.createdAt || msg.timestamp || new Date()).toISOString(),
        read: msg.read,
        readAt: msg.readAt
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Send a new message
const sendMessage = async (req, res) => {
  try {
    console.log('📩 sendMessage called:', req.body);
    const { receiverId, message, fileUrl, fileName, fileType, messageType } = req.body;
    // Get sender ID from middleware (req.userId is set by authMiddleware)
    const senderIdRaw = req.userId || req.user?._id || req.user?.id;
    const senderIdStr = senderIdRaw?.toString();
    console.log('👤 Sender ID:', senderIdStr, 'req.userId:', req.userId, 'req.user:', req.user?._id);

    if (!senderIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!receiverId || (!message && !fileUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message content or file attachment are required'
      });
    }

    // Validate and convert IDs to ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver ID'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(senderIdStr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender ID'
      });
    }

    const senderId = new mongoose.Types.ObjectId(senderIdStr);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Verify receiver exists
    const receiver = await User.findById(receiverObjectId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Determine default message text if empty but fileUrl present
    const messageText = message ? message.trim() : (fileName ? `📎 ${fileName}` : 'Attachment');
    
    // Determine messageType if not explicitly passed
    let computedMessageType = messageType || 'text';
    if (fileUrl) {
      if (fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl || fileName)) {
        computedMessageType = 'image';
      } else {
        computedMessageType = 'file';
      }
    }

    // Create new message with backend server UTC timestamp
    const serverDate = new Date();
    const newMessage = new Message({
      senderId,
      receiverId: receiverObjectId,
      message: messageText,
      messageType: computedMessageType,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      timestamp: serverDate,
      read: false
    });

    await newMessage.save();

    // Populate sender and receiver info for response
    await newMessage.populate('senderId', 'name email');
    await newMessage.populate('receiverId', 'name email');

    const isoTimestamp = serverDate.toISOString();

    // Create notification in database for the receiver
    console.log('📩 Creating message notification in database for receiver:', receiverId);
    const messageNotification = await Notification.create({
      type: 'message',
      title: `New Message from ${newMessage.senderId.name}`,
      message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
      senderId: senderId,
      senderName: newMessage.senderId.name,
      receiverId: receiverObjectId,
      link: '/chat'
    });
    console.log('✅ Message notification saved to database:', messageNotification._id);

    // Emit real-time message & notification to the receiver via socket
    const io = req.app.get('io');
    if (io) {
      const onlineUsersMap = io.onlineUsers;
      const receiverOnline = onlineUsersMap ? onlineUsersMap.get(receiverId) : null;
      
      const socketPayload = {
        id: newMessage._id,
        _id: newMessage._id,
        senderId: senderIdStr,
        senderName: newMessage.senderId?.name || 'User',
        senderEmail: newMessage.senderId?.email || '',
        receiverId: receiverId,
        receiverName: newMessage.receiverId?.name || 'User',
        message: newMessage.message,
        messageType: newMessage.messageType,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileType: newMessage.fileType,
        timestamp: isoTimestamp,
        createdAt: isoTimestamp,
        read: newMessage.read
      };

      if (receiverOnline && receiverOnline.isOnline) {
        io.to(receiverOnline.socketId).emit('receive_message', socketPayload);
        console.log(`📢 Real-time receive_message event emitted to receiver ${receiverId}`);

        io.to(receiverOnline.socketId).emit('newNotification', {
          id: messageNotification._id,
          type: 'message',
          title: `New Message from ${newMessage.senderId.name}`,
          message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
          senderId: senderIdStr,
          senderName: newMessage.senderId.name,
          receiverId: receiverId,
          messageId: newMessage._id,
          createdAt: isoTimestamp,
          read: false
        });
        console.log(`📢 Message notification emitted to receiver ${receiverId}`);
      } else {
        console.log(`ℹ️ Receiver ${receiverId} is not online, notification saved to database only`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage._id,
        senderId: newMessage.senderId._id,
        senderName: newMessage.senderId.name,
        senderEmail: newMessage.senderId.email,
        receiverId: newMessage.receiverId._id,
        receiverName: newMessage.receiverId.name,
        message: newMessage.message,
        messageType: newMessage.messageType,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileType: newMessage.fileType,
        timestamp: isoTimestamp,
        createdAt: isoTimestamp,
        read: newMessage.read
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const currentUserIdRaw = req.userId || req.user?._id || req.user?.id;
    const currentUserIdStr = currentUserIdRaw?.toString();

    if (!currentUserIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserIdStr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const currentUserId = new mongoose.Types.ObjectId(currentUserIdStr);

    const count = await Message.countDocuments({
      receiverId: currentUserId,
      read: false
    });

    // Get unread count per sender
    const unreadBySender = await Message.aggregate([
      {
        $match: {
          receiverId: currentUserId,
          read: false
        }
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      totalUnread: count,
      unreadBySender: unreadBySender.map(item => ({
        senderId: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Get recent conversations
const getConversations = async (req, res) => {
  try {
    const currentUserIdRaw = req.userId || req.user?._id || req.user?.id;
    const currentUserIdStr = currentUserIdRaw?.toString();

    if (!currentUserIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserIdStr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const currentUserId = new mongoose.Types.ObjectId(currentUserIdStr);

    // Get the most recent message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', currentUserId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiverId', currentUserId] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          profileImage: '$user.profileImage',
          lastMessage: {
            message: '$lastMessage.message',
            messageType: '$lastMessage.messageType',
            fileUrl: '$lastMessage.fileUrl',
            fileName: '$lastMessage.fileName',
            timestamp: '$lastMessage.timestamp',
            senderId: '$lastMessage.senderId'
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    // Fetch employee photos map as fallback for conversations profileImages
    const employees = await Employee.find({}, 'email name profileImage');
    const empImageMap = new Map();
    employees.forEach(emp => {
      if (emp.profileImage && emp.profileImage.trim() !== '') {
        if (emp.email) empImageMap.set(emp.email.toLowerCase(), emp.profileImage);
        if (emp.name) empImageMap.set(emp.name.toLowerCase(), emp.profileImage);
      }
    });

    const enrichedConversations = conversations.map(c => {
      const empPhoto = empImageMap.get(c.userEmail?.toLowerCase()) || empImageMap.get(c.userName?.toLowerCase());
      return {
        ...c,
        profileImage: c.profileImage || empPhoto || ''
      };
    });

    res.status(200).json({
      success: true,
      conversations: enrichedConversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

// Mark all messages from a specific sender as read
const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserIdRaw = req.userId || req.user?._id || req.user?.id;
    const currentUserIdStr = currentUserIdRaw?.toString();

    if (!currentUserIdStr) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const currentUserId = new mongoose.Types.ObjectId(currentUserIdStr);
    const senderId = new mongoose.Types.ObjectId(userId);

    // Find and update all unread messages where:
    // - receiverId = loggedInUser (current user)
    // - senderId = selectedUser (the user whose chat is opened)
    // - read = false
    const result = await Message.updateMany(
      {
        receiverId: currentUserId,
        senderId: senderId,
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getMessages,
  sendMessage,
  getUnreadCount,
  getConversations,
  markAsRead
};
