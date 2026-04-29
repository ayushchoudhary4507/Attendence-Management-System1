const express = require('express');
const router = express.Router();
const { authMiddleware, admin } = require('../middleware/authMiddleware');
const { generatePayslip } = require('../controllers/payslipController');

// Employee can download their own payslip
router.get('/my-payslip', authMiddleware, generatePayslip);
router.get('/:userId', authMiddleware, generatePayslip);

module.exports = router;
