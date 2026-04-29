const express = require('express');
const router = express.Router();
const { authMiddleware, admin } = require('../middleware/authMiddleware');
const {
  calculateSalary,
  getUserSalary,
  getAllSalaries,
  markAsPaid,
  triggerBulkCalculation
} = require('../controllers/salaryController');

// Employee can view their own salary
router.get('/my-salary', authMiddleware, getUserSalary);
router.get('/user/:userId', authMiddleware, getUserSalary);

// Admin only routes
router.post('/calculate', authMiddleware, admin, calculateSalary);
router.get('/', authMiddleware, admin, getAllSalaries);
router.put('/:id/pay', authMiddleware, admin, markAsPaid);
router.post('/bulk-calculate', authMiddleware, admin, triggerBulkCalculation);

module.exports = router;
