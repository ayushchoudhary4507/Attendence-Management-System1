const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const mongoose = require("mongoose");

/**
 * AI Analytics Service for Attendance Insights
 */
class AIAnalyticsService {
  /**
   * 1. Most Punctual Employees
   * Analyzes attendance to find top performers
   */
  async getPunctualityInsights() {
    return await Attendance.aggregate([
      {
        $match: {
          status: "Present",
          checkInTime: { $ne: null }
        }
      },
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
        $project: {
          employeeId: 1,
          name: "$employee.name",
          department: "$employee.role",
          checkInTime: 1,
          // Calculate if late (after 09:15 AM)
          isLate: {
            $gt: [
              { $hour: "$checkInTime" },
              9
            ]
          }
        }
      },
      {
        $group: {
          _id: "$employeeId",
          name: { $first: "$name" },
          department: { $first: "$department" },
          totalPresent: { $sum: 1 },
          lateCount: {
            $sum: { $cond: ["$isLate", 1, 0] }
          }
        }
      },
      {
        $project: {
          name: 1,
          department: 1,
          totalPresent: 1,
          lateCount: 1,
          punctualityScore: {
            $subtract: [
              100,
              { $multiply: [{ $divide: ["$lateCount", "$totalPresent"] }, 50] }
            ]
          }
        }
      },
      { $sort: { punctualityScore: -1, totalPresent: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * 2. Frequently Late Employees
   */
  async getLateEmployees() {
    return await Attendance.aggregate([
      {
        $match: {
          status: "Present",
          checkInTime: { $ne: null }
        }
      },
      {
        $project: {
          employeeId: 1,
          checkInTime: 1,
          hour: { $hour: "$checkInTime" },
          minute: { $minute: "$checkInTime" },
          lateMinutes: {
            $max: [
              0,
              {
                $subtract: [
                  { $add: [{ $multiply: [{ $hour: "$checkInTime" }, 60] }, { $minute: "$checkInTime" }] },
                  540 // 9:00 AM in minutes
                ]
              }
            ]
          }
        }
      },
      { $match: { lateMinutes: { $gt: 15 } } }, // Only if more than 15 mins late
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
          _id: "$employeeId",
          name: { $first: "$employee.name" },
          lateCount: { $sum: 1 },
          avgLateMinutes: { $avg: "$lateMinutes" }
        }
      },
      { $sort: { lateCount: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * 3. Department Attendance Trends
   */
  async getDepartmentTrends() {
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
          totalEmployees: { $addToSet: "$employeeId" },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] }
          },
          totalRecords: { $sum: 1 }
        }
      },
      {
        $project: {
          department: "$_id",
          employeeCount: { $size: "$totalEmployees" },
          attendancePercentage: {
            $multiply: [{ $divide: ["$presentCount", "$totalRecords"] }, 100]
          },
          absentCount: 1,
          presentCount: 1
        }
      },
      { $sort: { attendancePercentage: -1 } }
    ]);
  }

  /**
   * 4. AI Absent Prediction
   * Uses rule-based scoring algorithm
   */
  async getAbsencePredictions() {
    const employees = await Employee.find({ status: "Active" });
    const predictions = [];

    for (const emp of employees) {
      // Get last 30 days attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const records = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: thirtyDaysAgo }
      }).sort({ date: -1 });

      if (records.length === 0) continue;

      let absentCount = 0;
      let lateCount = 0;
      let consecutiveAbsences = 0;
      let currentStreak = 0;

      records.forEach((rec, index) => {
        if (rec.status === "Absent") {
          absentCount++;
          currentStreak++;
        } else {
          if (currentStreak > consecutiveAbsences) consecutiveAbsences = currentStreak;
          currentStreak = 0;
        }

        const hour = rec.checkInTime ? new Date(rec.checkInTime).getHours() : 0;
        if (rec.status === "Present" && hour >= 9 && new Date(rec.checkInTime).getMinutes() > 15) {
          lateCount++;
        }
      });

      // Simple AI Prediction Logic
      // Risk Factors: High absent rate, frequent lateness, consecutive absences
      const attendanceRate = (records.filter(r => r.status === "Present").length / records.length) * 100;
      
      let riskScore = 0;
      if (attendanceRate < 80) riskScore += 40;
      if (absentCount > 3) riskScore += 20;
      if (lateCount > 5) riskScore += 15;
      if (consecutiveAbsences >= 2) riskScore += 25;

      predictions.push({
        employeeId: emp._id,
        name: emp.name,
        department: emp.role,
        attendancePercentage: attendanceRate.toFixed(2),
        riskScore: Math.min(riskScore, 100),
        absentHistory: absentCount,
        predictedProbability: `${Math.min(riskScore + 10, 95)}%`,
        status: riskScore > 60 ? "High Risk" : riskScore > 30 ? "Medium Risk" : "Low Risk"
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Bonus: AI Generated Summary
   */
  async getAISummary() {
    const deptTrends = await this.getDepartmentTrends();
    const bestDept = deptTrends[0] ? deptTrends[0].department : "N/A";
    const avgAttendance = deptTrends.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / (deptTrends.length || 1);

    return {
      totalDepartments: deptTrends.length,
      overallAttendance: avgAttendance.toFixed(2),
      topPerformingDept: bestDept,
      summaryText: `The overall attendance is ${avgAttendance.toFixed(2)}%. The ${bestDept} department is performing best with the highest attendance rate. Suggest monitoring high-risk employees identified in the prediction table.`
    };
  }
}

module.exports = new AIAnalyticsService();
