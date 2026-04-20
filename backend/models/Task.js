const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Task must be assigned to an employee']
  },
  assignedToEmail: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster queries by assigned employee
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);
