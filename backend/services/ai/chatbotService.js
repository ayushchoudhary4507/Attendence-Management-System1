const logger = require('../../utils/logger');
const Attendance = require("../../models/Attendance");
const Employee = require("../../models/Employee");
const Leave = require("../../models/Leave");
const Holiday = require("../../models/Holiday");
const Shift = require("../../models/Shift");
const Project = require("../../models/Project");
const aiAnalyticsEngine = require("./aiAnalyticsEngine");

class AIChatbotService {
  async handleQuery(query) {
    const analyticsService = require("./analyticsService");
    const predictionService = require("./predictionService");
    const anomalyDetector = require("./anomalyDetector");

    try {
      logger.info(`Processing AI Chat Query: "${query}"`);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch rich context from all modules simultaneously
      const [
        employees,
        rankings,
        predictions,
        anomalies,
        todayAttendance,
        history,
        leaves,
        holidays,
        shifts,
        projects
      ] = await Promise.all([
        Employee.find({}).lean().catch(() => []),
        analyticsService.getPerformanceRankings().catch(() => []),
        predictionService.getAbsencePredictions().catch(() => []),
        anomalyDetector.detectAnomalies().catch(() => []),
        Attendance.find({ 
          date: { $gte: startOfToday, $lte: endOfToday } 
        }).populate('employeeId').lean().catch(() => []),
        Attendance.find({
          date: { $gte: thirtyDaysAgo, $lte: endOfToday }
        }).populate('employeeId').limit(150).sort({ date: -1 }).lean().catch(() => []),
        Leave.find({}).sort({ createdAt: -1 }).limit(20).lean().catch(() => []),
        Holiday.find({}).sort({ date: 1 }).limit(10).lean().catch(() => []),
        Shift.find({}).lean().catch(() => []),
        Project.find({}).limit(15).lean().catch(() => [])
      ]);

      const formattedToday = todayAttendance.map(a => ({
        name: a.employeeId?.name || a.employeeName || "Employee",
        status: a.status || "Present",
        time: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : (a.inTime || "N/A"),
        dept: a.employeeId?.department || a.employeeId?.role || "Staff"
      }));

      const context = {
        employees: employees.map(e => ({
          name: e.name,
          email: e.email,
          phone: e.phone || e.phoneNumber || '',
          department: e.department || e.role,
          designation: e.designation || e.role,
          status: e.status || 'Active'
        })),
        rankings: rankings.slice(0, 20),
        topPerformers: rankings.slice(0, 5),
        highRiskEmployees: predictions.filter(p => p.status === "Critical").slice(0, 5),
        recentAnomalies: anomalies.slice(0, 5),
        todayAttendance: formattedToday,
        attendanceHistory: history.map(a => ({
          name: a.employeeId?.name || "Employee",
          date: a.date ? new Date(a.date).toLocaleDateString('en-IN') : '',
          status: a.status
        })),
        leaves: leaves.map(l => ({
          employeeName: l.employeeName || l.name,
          leaveType: l.leaveType || l.type,
          startDate: l.startDate,
          endDate: l.endDate,
          reason: l.reason,
          status: l.status || 'Pending'
        })),
        holidays: holidays.map(h => ({
          name: h.name || h.title,
          date: h.date,
          day: h.day
        })),
        shifts: shifts.map(s => ({
          name: s.name || s.shiftName,
          startTime: s.startTime,
          endTime: s.endTime
        })),
        projects: projects.map(p => ({
          name: p.name || p.title,
          status: p.status,
          team: p.team
        })),
        summary: {
          totalEmployees: employees.length || rankings.length,
          avgOverallScore: rankings.length > 0 
            ? (rankings.reduce((acc, r) => acc + (parseFloat(r.overallScore || r.score) || 0), 0) / rankings.length).toFixed(1)
            : "88.5",
          todayStats: {
            present: formattedToday.filter(a => a.status === 'Present' || a.status === 'Late').length,
            absent: employees.length - formattedToday.length > 0 ? employees.length - formattedToday.length : 0,
            late: formattedToday.filter(a => a.status === 'Late').length
          }
        }
      };

      // Pass both query and rich context to the engine
      return await aiAnalyticsEngine.getExecutiveSummary(context, query);
    } catch (error) {
      logger.error("Chatbot Service Critical Error:", error);
      const fallbackService = require("./aiFallbackService");
      return fallbackService.answerQuery(query, {});
    }
  }
}

module.exports = new AIChatbotService();
