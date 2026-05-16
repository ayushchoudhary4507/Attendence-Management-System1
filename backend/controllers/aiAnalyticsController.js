const aiAnalyticsService = require("../services/aiAnalyticsService");

/**
 * Controller for AI Attendance Insights
 */
const getPunctualityInsights = async (req, res) => {
  try {
    const data = await aiAnalyticsService.getPunctualityInsights();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLateEmployees = async (req, res) => {
  try {
    const data = await aiAnalyticsService.getLateEmployees();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDepartmentTrends = async (req, res) => {
  try {
    const data = await aiAnalyticsService.getDepartmentTrends();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAbsencePredictions = async (req, res) => {
  try {
    const data = await aiAnalyticsService.getAbsencePredictions();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAIOverview = async (req, res) => {
  try {
    const punctuality = await aiAnalyticsService.getPunctualityInsights();
    const lateEmployees = await aiAnalyticsService.getLateEmployees();
    const departmentTrends = await aiAnalyticsService.getDepartmentTrends();
    const predictions = await aiAnalyticsService.getAbsencePredictions();
    const summary = await aiAnalyticsService.getAISummary();

    res.status(200).json({
      success: true,
      data: {
        punctuality,
        lateEmployees,
        departmentTrends,
        predictions,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPunctualityInsights,
  getLateEmployees,
  getDepartmentTrends,
  getAbsencePredictions,
  getAIOverview
};
