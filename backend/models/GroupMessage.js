const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required']
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
groupMessageSchema.index({ groupId: 1, timestamp: -1 });
groupMessageSchema.index({ senderId: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
