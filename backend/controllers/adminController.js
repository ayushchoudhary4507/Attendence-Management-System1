const User = require('../models/User');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Leave = require('../models/Leave');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({
      message: 'Users retrieved successfully',
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });     
  }
};

// Get user by ID (Admin only)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user role (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or employee' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      message: 'User deleted successfully',
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get dashboard statistics (Admin only)
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const employeeCount = await User.countDocuments({ role: 'employee' });
    const totalEmployees = await Employee.countDocuments();
    const totalProjects = await Project.countDocuments();
    // const pendingLeaves = await Leave.getPendingLeavesCount();

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      stats: {
        totalUsers,
        adminCount,
        employeeCount,
        totalEmployees,
        totalProjects
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password using base64
    const hashedPassword = Buffer.from(password).toString('base64');

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'employee'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user (Admin only)
const updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getDashboardStats,
  createUser,
  updateUser
};
