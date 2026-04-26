const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Holiday date is required']
  },
  type: {
    type: String,
    enum: ['public', 'company'],
    default: 'public'
  },
  description: {
    type: String,
    default: ''
  },
  year: {
    type: Number,
    required: true
  },
  recurring: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for date queries
holidaySchema.index({ date: 1, year: 1 });
holidaySchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
