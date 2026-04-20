const Task = require('../models/Task');
const Employee = require('../models/Employee');
const User = require('../models/User');

// @desc    Create new task (Admin only)
// @route   POST /api/tasks
// @access  Admin only
const createTask = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { title, description, assignedTo, dueDate, priority = 'Medium', notes = '' } = req.body;

    // Find the employee to get their email
    const employee = await Employee.findById(assignedTo);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Also find the user with matching email to ensure linkage
    const user = await User.findOne({ email: { $regex: new RegExp('^' + employee.email + '$', 'i') } });

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedToEmail: employee.email.toLowerCase(),
      assignedToName: employee.name,
      dueDate: new Date(dueDate),
      priority,
      notes,
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.email,
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get all tasks (Admin sees all, Employee sees only their own)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let tasks;

    if (req.user.role === 'admin') {
      // Admin sees all tasks with employee details
      tasks = await Task.find()
        .populate('assignedTo', 'name email employeeId designation')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Employee sees only their tasks
      // First find the employee record for this user (case-insensitive email match)
      const user = await User.findById(req.user._id);
      const employee = await Employee.findOne({ 
        email: { $regex: new RegExp('^' + user.email + '$', 'i') } 
      });
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found'
        });
      }

      tasks = await Task.find({ assignedTo: employee._id })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get tasks for logged in employee
// @route   GET /api/tasks/my-tasks
// @access  Private (Employee only)
const getMyTasks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Case-insensitive email match
    const employee = await Employee.findOne({ 
      email: { $regex: new RegExp('^' + user.email + '$', 'i') } 
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found'
      });
    }

    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Count by status
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
    const completedCount = tasks.filter(t => t.status === 'Completed').length;

    res.json({
      success: true,
      count: tasks.length,
      pendingCount,
      inProgressCount,
      completedCount,
      data: tasks
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update task status (Employee can update their own tasks)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const taskId = req.params.id;

    let task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is admin or the assigned employee
    const user = await User.findById(req.user._id);
    const isAdmin = req.user.role === 'admin';
    
    let isAssignedEmployee = false;
    if (!isAdmin) {
      const employee = await Employee.findOne({ 
        email: { $regex: new RegExp('^' + user.email + '$', 'i') } 
      });
      if (employee) {
        isAssignedEmployee = task.assignedTo.toString() === employee._id.toString();
      }
    }

    if (!isAdmin && !isAssignedEmployee) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own tasks.'
      });
    }

    // Update fields
    if (status) task.status = status;
    if (notes) task.notes = notes;
    
    // If status changed to completed, set completedAt
    if (status === 'Completed' && task.status === 'Completed') {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete task (Admin only)
// @route   DELETE /api/tasks/:id
// @access  Admin only
const deleteTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get task statistics for admin dashboard
// @route   GET /api/tasks/stats
// @access  Admin only
const getTaskStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: 'Pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'In Progress' });
    const completedTasks = await Task.countDocuments({ status: 'Completed' });

    res.json({
      success: true,
      data: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  getTaskStats
};
