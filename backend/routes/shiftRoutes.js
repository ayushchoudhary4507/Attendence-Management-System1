const express = require('express');
const router = express.Router();
const { authMiddleware, admin } = require('../middleware/authMiddleware');
const {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
  assignShift,
  getUserShifts,
  getAllAssignments,
  removeAssignment
} = require('../controllers/shiftController');

// Employee can view their own shifts
router.get('/my-shifts', authMiddleware, getUserShifts);
router.get('/user/:userId', authMiddleware, getUserShifts);

// Authenticated users can view shifts list
router.get('/', authMiddleware, getAllShifts);
router.get('/assignments', authMiddleware, getAllAssignments);
router.get('/:id', authMiddleware, getShiftById);

// Admin only routes
router.post('/create', authMiddleware, admin, createShift);
router.put('/:id', authMiddleware, admin, updateShift);
router.delete('/:id', authMiddleware, admin, deleteShift);
router.post('/assign', authMiddleware, admin, assignShift);
router.delete('/assignment/:id', authMiddleware, admin, removeAssignment);

module.exports = router;
