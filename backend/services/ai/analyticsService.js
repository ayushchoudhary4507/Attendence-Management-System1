const Attendance = require("../../models/Attendance");
const Employee = require("../../models/Employee");
const mongoose = require("mongoose");

/**
 * AI Analytics Service - Deep Data Insights
 */
class AIAnalyticsService {
  /**
   * Get comprehensive analytics for a specific employee
   */
  async getEmployeeDeepAnalytics(employeeId) {
    const id = new mongoose.Types.ObjectId(employeeId);
    
    const stats = await Attendance.aggregate([
      { $match: { employeeId: id } },
      {
        $group: {
          _id: "$employeeId",
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
          totalWorkHours: { $sum: "$workHours" },
          avgWorkHours: { $avg: "$workHours" },
          lateCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Present"] },
                    { $gt: [{ $hour: "$checkInTime" }, 9] },
                    { $gt: [{ $minute: "$checkInTime" }, 15] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    if (stats.length === 0) return null;

    const s = stats[0];
    const attendancePercentage = ((s.presentDays + (s.halfDays * 0.5)) / s.totalDays) * 100;
    
    // Performance Scoring Logic
    const punctualityScore = Math.max(0, 100 - (s.lateCount / s.presentDays * 100));
    const consistencyScore = Math.max(0, 100 - (s.absentDays / s.totalDays * 100 * 2));
    const reliabilityScore = (attendancePercentage * 0.7) + (punctualityScore * 0.3);
    
    const overallScore = (reliabilityScore + consistencyScore) / 2;

    return {
      ...s,
      attendancePercentage: attendancePercentage.toFixed(2),
      punctualityScore: punctualityScore.toFixed(2),
      consistencyScore: consistencyScore.toFixed(2),
      reliabilityScore: reliabilityScore.toFixed(2),
      overallScore: overallScore.toFixed(2),
      status: overallScore > 80 ? "Excellent" : overallScore > 60 ? "Good" : "Needs Improvement"
    };
  }

  /**
   * Get department-wide analytics comparison
   */
  async getDepartmentComparison() {
    return await Attendance.aggregate([
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: "$employee" },
      {
        $group: {
          _id: "$employee.role",
          avgAttendance: {
            $avg: {
              $cond: [{ $eq: ["$status", "Present"] }, 100, 0]
            }
          },
          totalWorkHours: { $sum: "$workHours" },
          lateCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Present"] },
                    { $gt: [{ $hour: "$checkInTime" }, 9] }
                  ]
                },
                1,
                0
              ]
            }
          },
          employeeCount: { $addToSet: "$employeeId" }
        }
      },
      {
        $project: {
          department: "$_id",
          avgAttendance: { $round: ["$avgAttendance", 2] },
          totalWorkHours: 1,
          lateCount: 1,
          employeeCount: { $size: "$employeeCount" }
        }
      },
      { $sort: { avgAttendance: -1 } }
    ]);
  }

  /**
   * Performance Rankings
   */
  async getPerformanceRankings() {
    const employees = await Employee.find({ status: "Active" });
    const rankings = [];

    for (const emp of employees) {
      const analytics = await this.getEmployeeDeepAnalytics(emp._id);
      if (analytics) {
        rankings.push({
          id: emp._id,
          name: emp.name,
          department: emp.role,
          overallScore: parseFloat(analytics.overallScore),
          attendance: analytics.attendancePercentage
        });
      }
    }

    return rankings.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Get General Insights for the dashboard
   */
  async getGeneralInsights() {
    const anomalyDetector = require("./anomalyDetector");

    const [anomalies, departmentStats, rankings] = await Promise.all([
      anomalyDetector.detectAnomalies(),
      this.getDepartmentComparison(),
      this.getPerformanceRankings()
    ]);

    // Format Frequent Absentees
    const frequentAbsentees = rankings
      .filter(r => parseFloat(r.attendance) < 80)
      .slice(0, 5)
      .map(r => `${r.name} (${r.attendance}% Attendance)`);

    // Format Late Patterns
    const totalLate = departmentStats.reduce((sum, d) => sum + d.lateCount, 0);
    const latePatterns = totalLate > 0 
      ? `Detected ${totalLate} late arrivals across departments. ${departmentStats[0]?.department || 'Main'} department shows highest variance.`
      : "No significant late arrival patterns detected in the current period.";

    // Format Suspicious Behavior
    const suspiciousBehavior = anomalies.length > 0
      ? anomalies.slice(0, 5).map(a => `${a.name}: ${a.type} (${a.severity})`)
      : ["No suspicious behaviors detected."];

    return {
      frequentAbsentees: frequentAbsentees.length > 0 ? frequentAbsentees : ["All employees above 80% attendance."],
      latePatterns,
      departmentPerformance: departmentStats.map(d => `${d.department}: ${d.avgAttendance}% average attendance`),
      suspiciousBehavior,
      rawStats: { departmentStats, anomalies, rankings: rankings.slice(-5) }
    };
  }
}

module.exports = new AIAnalyticsService();
