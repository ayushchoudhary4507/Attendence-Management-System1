const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['attendance', 'checkin', 'checkout', 'leave', 'other'],
    default: 'attendance'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true
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

module.exports = mongoose.model('Notification', notificationSchema);
