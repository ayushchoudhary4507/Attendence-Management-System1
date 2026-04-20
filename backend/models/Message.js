const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver ID is required']
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
