const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  profileImage: {
    type: String,
    default: ''
  },
  settings: {
    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      }
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
      employeeUpdates: { type: Boolean, default: false },
      systemAlerts: { type: Boolean, default: true }
    }
  },
  notifications: [{
    id: Number,
    title: String,
    message: String,
    time: String,
    read: { type: Boolean, default: false },
    type: { type: String, enum: ['success', 'warning', 'info', 'message'] },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
