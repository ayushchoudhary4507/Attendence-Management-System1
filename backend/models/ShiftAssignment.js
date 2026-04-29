const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: [true, 'Shift ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isNotified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index: one shift assignment per employee per date
shiftAssignmentSchema.index({ employeeId: 1, date: 1 }, { unique: true });
shiftAssignmentSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
