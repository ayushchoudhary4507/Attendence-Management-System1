const express = require('express');
const router = express.Router();
const { getLandingPageStats } = require('../controllers/publicController');

// Public route for landing page statistics (no authentication required)
router.get('/landing-stats', getLandingPageStats);

module.exports = router;
