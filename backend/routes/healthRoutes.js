const express = require('express');
const router = express.Router();
const { checkDBStatus, checkAIStatus, getSystemMetrics } = require('../utils/healthCheck');

router.get('/', async (req, res) => {
    const db = await checkDBStatus();
    const system = getSystemMetrics();
    
    res.json({
        success: true,
        message: 'System Health Status',
        timestamp: new Date(),
        database: db,
        system: system
    });
});

router.get('/ai', async (req, res) => {
    const ai = await checkAIStatus();
    res.json({
        success: true,
        aiStatus: ai
    });
});

router.get('/db', async (req, res) => {
    const db = await checkDBStatus();
    res.json({
        success: true,
        dbStatus: db
    });
});

module.exports = router;
