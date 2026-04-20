const express = require('express');
const router = express.Router();
const { adminMiddleware, checkRole } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes are protected by adminMiddleware
router.use(adminMiddleware);

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Dashboard Statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
