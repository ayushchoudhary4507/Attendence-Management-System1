const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000
  },
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: 0
  },
  perDaySalary: {
    type: Number,
    default: 0,
    min: 0
  },
  perHourSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPresentDays: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAbsentDays: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWorkingHours: {
    type: Number,
    default: 0,
    min: 0
  },
  lateCount: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: 0
  },
  bonus: {
    type: Number,
    default: 0,
    min: 0
  },
  finalSalary: {
    type: Number,
    required: [true, 'Final salary is required'],
    min: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidOn: {
    type: Date,
    default: null
  },
  calculatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index: one salary record per employee per month/year
salarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('Salary', salarySchema);
