const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

/**
 * @swagger
 * /api/ai/insights:
 *   get:
 *     summary: Get AI-powered attendance insights
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.get("/insights", authMiddleware, aiController.getAIInsights);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI assistant about attendance data
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post("/chat", authMiddleware, aiController.handleAIChat);

module.exports = router;
