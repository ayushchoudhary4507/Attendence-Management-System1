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
    enum: ['Present', 'Absent', 'Half Day', 'Leave', 'present', 'absent', 'half day', 'leave', 'Half-Day', 'half-day'],
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
  },
  verificationMethod: {
    type: String,
    enum: ['manual', 'qr_code', 'geolocation', 'qr_and_geo', 'face_recognition', 'face_lock', 'face', 'FACE', 'gps', 'GPS', 'qr', 'QR'],
    default: 'manual'
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    address: { type: String, default: '' },
    distanceInMeters: { type: Number, default: null },
    isWithinOfficeRadius: { type: Boolean, default: false }
  },
  qrToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Pre-validate hook to normalize status and verificationMethod
attendanceSchema.pre('validate', function(next) {
  if (this.status) {
    const s = this.status.toString().toLowerCase().trim();
    if (s === 'present') this.status = 'Present';
    else if (s === 'absent') this.status = 'Absent';
    else if (s === 'leave' || s === 'on leave') this.status = 'Leave';
    else if (s === 'half day' || s === 'half-day') this.status = 'Half Day';
  }
  if (this.verificationMethod) {
    const m = this.verificationMethod.toString().toLowerCase().trim();
    if (m === 'face' || m === 'face_lock' || m === 'face_recognition' || m === 'face-recognition') {
      this.verificationMethod = 'face_recognition';
    } else if (m === 'gps' || m === 'geo' || m === 'geolocation') {
      this.verificationMethod = 'geolocation';
    } else if (m === 'qr' || m === 'qr_code' || m === 'qr-code') {
      this.verificationMethod = 'qr_code';
    } else if (m === 'qr_and_geo') {
      this.verificationMethod = 'qr_and_geo';
    } else {
      this.verificationMethod = 'manual';
    }
  }
  next();
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
