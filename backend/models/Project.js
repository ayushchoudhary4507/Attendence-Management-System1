const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'On Hold', 'Completed'],
    default: 'Planning'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  team: [{
    type: String,
    trim: true
  }],
  deadline: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
