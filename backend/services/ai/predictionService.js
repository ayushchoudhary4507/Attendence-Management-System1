const Attendance = require("../../models/Attendance");
const Employee = require("../../models/Employee");

/**
 * AI Prediction Service - Burnout and Absence Forecasting
 */
class AIPredictionService {
  /**
   * Predict absentee risk for all active employees
   */
  async getAbsencePredictions() {
    const employees = await Employee.find({ status: "Active" });
    const predictions = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const emp of employees) {
      const records = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: thirtyDaysAgo }
      }).sort({ date: 1 });

      if (records.length < 5) continue; // Not enough data

      let riskScore = 0;
      let factors = [];

      // 1. Attendance Drop Trend
      const firstHalf = records.slice(0, Math.floor(records.length / 2));
      const secondHalf = records.slice(Math.floor(records.length / 2));
      
      const firstHalfPresent = firstHalf.filter(r => r.status === "Present").length / firstHalf.length;
      const secondHalfPresent = secondHalf.filter(r => r.status === "Present").length / secondHalf.length;

      if (secondHalfPresent < firstHalfPresent) {
        const drop = (firstHalfPresent - secondHalfPresent) * 100;
        riskScore += drop;
        factors.push(`Attendance dropped by ${drop.toFixed(1)}% recently`);
      }

      // 2. Late Arrival Trend
      const lateCount = records.filter(r => r.checkInTime && new Date(r.checkInTime).getHours() >= 9 && new Date(r.checkInTime).getMinutes() > 15).length;
      if (lateCount > 5) {
        riskScore += 20;
        factors.push("Frequent late arrivals detected (Possible burnout)");
      }

      // 3. Consecutive Absence Pattern
      let maxConsecutive = 0;
      let currentConsecutive = 0;
      records.forEach(r => {
        if (r.status === "Absent") {
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
        } else {
          currentConsecutive = 0;
        }
      });

      if (maxConsecutive >= 2) {
        riskScore += 30;
        factors.push("Pattern of consecutive absences detected");
      }

      // 4. Overtime / Long Hours (Burnout Risk)
      const avgWorkHours = records.reduce((acc, r) => acc + (r.workHours || 0), 0) / records.length;
      if (avgWorkHours > 9) {
        riskScore += 15;
        factors.push("Consistently high work hours (High burnout risk)");
      }

      predictions.push({
        employeeId: emp._id,
        name: emp.name,
        department: emp.role,
        riskScore: Math.min(riskScore, 100).toFixed(2),
        probability: `${Math.min(riskScore + 10, 95).toFixed(1)}%`,
        status: riskScore > 60 ? "Critical" : riskScore > 30 ? "Warning" : "Stable",
        factors
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }
}

module.exports = new AIPredictionService();
