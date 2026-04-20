const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware, adminMiddleware } = require('../middleware/adminMiddleware');

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
