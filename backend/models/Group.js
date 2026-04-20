const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    message: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
groupSchema.index({ members: 1 });
groupSchema.index({ createdAt: -1 });

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId.toString() === userId.toString());
};

// Method to check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && member.role === 'admin';
};

module.exports = mongoose.model('Group', groupSchema);
