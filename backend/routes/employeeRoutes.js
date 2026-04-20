const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  inviteEmployee,
  importEmployees
} = require('../controllers/employeeController');
const { authMiddleware, adminMiddleware } = require('../middleware/adminMiddleware');

// Employee routes - View only for all authenticated users
router.route('/')
  .get(authMiddleware, getEmployees)
  .post(adminMiddleware, createEmployee);

router.route('/:id')
  .get(authMiddleware, getEmployee)
  .put(adminMiddleware, updateEmployee)
  .delete(adminMiddleware, deleteEmployee);

// Additional routes - Admin only
router.post('/invite', adminMiddleware, inviteEmployee);
router.post('/import', adminMiddleware, importEmployees);

module.exports = router;
