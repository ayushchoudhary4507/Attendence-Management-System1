const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  getTaskStats
} = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/adminMiddleware');

// Create new task - Admin only
router.post('/', authMiddleware, createTask);

// Get all tasks (Admin sees all, Employee sees own)
router.get('/', authMiddleware, getTasks);

// Get my tasks - Employee only
router.get('/my-tasks', authMiddleware, getMyTasks);

// Get task stats - Admin only
router.get('/stats', authMiddleware, getTaskStats);

// Update task
router.put('/:id', authMiddleware, updateTask);

// Delete task - Admin only
router.delete('/:id', authMiddleware, deleteTask);

module.exports = router;
