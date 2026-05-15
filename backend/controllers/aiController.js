const aiService = require("../services/aiService");

/**
 * Get AI-generated attendance insights
 */
const getAIInsights = async (req, res) => {
  try {
    const insights = await aiService.generateInsights();
    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error("❌ AI Insights Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI insights",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Handle AI chat messages
 */
const handleAIChat = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required"
      });
    }

    const response = await aiService.chatWithAI(query);
    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("❌ AI Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process AI chat",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getAIInsights,
  handleAIChat
};
