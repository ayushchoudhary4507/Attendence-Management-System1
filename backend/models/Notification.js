const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  senderName: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['leave_request', 'user_activity', 'project_update', 'attendance', 'checkin', 'checkout', 'leave', 'message', 'other', 'late_login', 'leave_approved', 'leave_rejected', 'shift_assigned', 'salary_generated'],
    default: 'other'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  employeeName: {
    type: String,
    default: ''
  },
  employeeEmail: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ receiverId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
