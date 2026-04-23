const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware, adminMiddleware } = require('../middleware/adminMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           description: Project name
 *         description:
 *           type: string
 *           description: Project description
 *         status:
 *           type: string
 *           enum: [active, inactive, completed, pending]
 *           description: Project status
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         assignedEmployees:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of employee IDs
 *         createdBy:
 *           type: string
 *           description: Admin ID who created the project
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - name
 *         - status
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     description: Retrieve all projects (Authenticated users)
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all projects
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
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create new project
 *     description: Create a new project (Admin only)
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     description: Retrieve a single project by ID
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update project
 *     description: Update project details (Admin only)
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *   delete:
 *     summary: Delete project
 *     description: Delete a project (Admin only)
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */

/**
 * @swagger
 * /api/projects/status/{status}:
 *   get:
 *     summary: Get projects by status
 *     description: Filter projects by status
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [active, inactive, completed, pending]
 *         description: Project status filter
 *     responses:
 *       200:
 *         description: List of projects with specified status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 */

// Get all projects - view for all authenticated users
router.get('/', authMiddleware, projectController.getAllProjects);

// Get projects by status - view for all authenticated users
router.get('/status/:status', authMiddleware, projectController.getProjectsByStatus);

// Get single project - view for all authenticated users
router.get('/:id', authMiddleware, projectController.getProjectById);

// Create project - admin only
router.post('/', adminMiddleware, projectController.createProject);

// Update project - admin only
router.put('/:id', adminMiddleware, projectController.updateProject);

// Delete project - admin only
router.delete('/:id', adminMiddleware, projectController.deleteProject);

module.exports = router;
