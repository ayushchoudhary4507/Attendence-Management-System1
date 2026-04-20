const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'Leave'],
    default: 'Present'
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  },
  workHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster queries by employee and date
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ userId: 1, date: 1 });

// Static method to check if attendance exists for today
attendanceSchema.statics.hasAttendanceToday = async function(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const attendance = await this.findOne({
    employeeId,
    date: { $gte: today, $lt: tomorrow }
  });
  
  return !!attendance;
};

// Static method to get today's attendance for an employee
attendanceSchema.statics.getTodayAttendance = async function(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await this.findOne({
    employeeId,
    date: { $gte: today, $lt: tomorrow }
  });
};

module.exports = mongoose.model('Attendance', attendanceSchema);
