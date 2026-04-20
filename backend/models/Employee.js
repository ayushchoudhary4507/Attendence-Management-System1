const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true
  },
  name: {  khguiguyoiyi
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    enum: ['Intern', 'Software Development', 'Manager', 'Team Lead', 'HR', 
           'Sales Representative', 'Sales Manager', 
           'HR Executive', 'HR Manager',
           'IT Support', 'IT Manager',
           'Marketing Executive', 'Marketing Manager']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['Employee', 'Interns', 'Manager', 'Admin', 'IT', 'Sales', 'Marketing', 'HR'],
    default: 'Interns'
  },
  reportingTo: {
    type: String,
    required: [true, 'Reporting manager is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate employee ID if not provided
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
