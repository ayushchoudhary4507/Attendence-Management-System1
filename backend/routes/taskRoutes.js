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

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           description: Task description
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *           description: Task status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Task priority
 *         assignedTo:
 *           type: string
 *           description: Employee ID
 *         project:
 *           type: string
 *           description: Project ID
 *         dueDate:
 *           type: string
 *           format: date
 *         createdBy:
 *           type: string
 *           description: Admin ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - title
 *         - assignedTo
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Admin sees all tasks, Employee sees own tasks
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create new task
 *     description: Create a new task (Admin only)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: Task created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/my-tasks:
 *   get:
 *     summary: Get my tasks
 *     description: Get current user's assigned tasks
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     description: Get task statistics (Admin only)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 inProgress:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task
 *     description: Update task details
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete task
 *     description: Delete a task (Admin only)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */

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
