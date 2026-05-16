const logger = require('../../utils/logger');
const Attendance = require("../../models/Attendance");
const aiAnalyticsEngine = require("./aiAnalyticsEngine");

class AIChatbotService {
  async handleQuery(query) {
    const analyticsService = require("./analyticsService");
    const predictionService = require("./predictionService");
    const anomalyDetector = require("./anomalyDetector");

    try {
      logger.info(`Processing AI Chat Query: ${query}`);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch relevant data context with error boundaries for each
      const [rankings, predictions, anomalies, todayAttendance, history] = await Promise.all([
        analyticsService.getPerformanceRankings().catch(e => []),
        predictionService.getAbsencePredictions().catch(e => []),
        anomalyDetector.detectAnomalies().catch(e => []),
        Attendance.find({ 
          date: { $gte: startOfToday, $lte: endOfToday } 
        }).populate('employeeId').catch(e => []),
        Attendance.find({
          date: { $gte: sevenDaysAgo, $lte: endOfToday }
        }).populate('employeeId').limit(100).sort({ date: -1 }).catch(e => [])
      ]);

      const context = {
        rankings: rankings.slice(0, 20), // Top 20 for context
        topPerformers: rankings.slice(0, 5),
        highRiskEmployees: predictions.filter(p => p.status === "Critical").slice(0, 5),
        recentAnomalies: anomalies.slice(0, 5),
        todayAttendance: todayAttendance.map(a => ({
          name: a.employeeId?.name || "Unknown",
          status: a.status,
          time: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString() : "N/A",
          dept: a.employeeId?.role || "N/A"
        })),
        attendanceHistory: history.map(a => ({
          name: a.employeeId?.name || "Unknown",
          date: new Date(a.date).toLocaleDateString(),
          status: a.status
        })),
        summary: {
          totalEmployees: rankings.length,
          avgOverallScore: rankings.length > 0 
            ? (rankings.reduce((acc, r) => acc + (parseFloat(r.overallScore) || 0), 0) / rankings.length).toFixed(2)
            : "N/A",
          todayStats: {
            present: todayAttendance.filter(a => a.status === 'Present').length,
            absent: todayAttendance.filter(a => a.status === 'Absent').length,
            late: todayAttendance.filter(a => a.status === 'Late').length
          }
        }
      };

      // Pass both query and context to the engine
      return await aiAnalyticsEngine.getExecutiveSummary(context, query);
    } catch (error) {
      logger.error("Chatbot Service Critical Error:", error);
      return "I encountered a critical error while processing your request. Please check the system logs for details.";
    }
  }
}

module.exports = new AIChatbotService();
