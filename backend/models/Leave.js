const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave', 'Emergency Leave']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  appliedOn: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedOn: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  }
});

// Static method to get leave stats for an employee
leaveSchema.statics.getLeaveStats = async function(employeeId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: 'Approved',
        startDate: { $gte: startOfYear, $lte: endOfYear }
      }
    },
    {
      $group: {
        _id: '$leaveType',
        totalDays: { $sum: '$totalDays' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to check overlapping leaves
leaveSchema.statics.hasOverlappingLeave = async function(employeeId, startDate, endDate) {
  const existing = await this.findOne({
    employeeId,
    status: { $in: ['Pending', 'Approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });
  return !!existing;
};

// Static method to get pending leaves count for admin
leaveSchema.statics.getPendingLeavesCount = async function() {
  return this.countDocuments({ status: 'Pending' });
};

// Static method to get all pending leaves with employee details
leaveSchema.statics.getPendingLeaves = async function() {
  return this.find({ status: 'Pending' })
    .populate('employeeId', 'name email employeeId designation')
    .sort({ appliedOn: -1 });
};

module.exports = mongoose.model('Leave', leaveSchema);
