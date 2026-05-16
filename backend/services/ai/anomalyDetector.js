const Attendance = require("../../models/Attendance");
const Employee = require("../../models/Employee");

/**
 * AI Anomaly Detector - Behavioral Pattern Analysis
 */
class AIAnomalyDetector {
  /**
   * Detect anomalies in attendance patterns
   */
  async detectAnomalies() {
    const activeEmployees = await Employee.find({ status: "Active" });
    const anomalies = [];

    for (const emp of activeEmployees) {
      const records = await Attendance.find({ employeeId: emp._id })
        .sort({ date: -1 })
        .limit(60); // Check last 2 months

      if (records.length < 10) continue;

      // 1. Monday Absence Pattern
      const mondayAbsences = records.filter(r => {
        const d = new Date(r.date);
        return d.getDay() === 1 && r.status === "Absent"; // 1 is Monday
      }).length;

      const totalMondays = records.filter(r => new Date(r.date).getDay() === 1).length;
      
      if (totalMondays > 4 && (mondayAbsences / totalMondays) > 0.6) {
        anomalies.push({
          employeeId: emp._id,
          name: emp.name,
          type: "Frequent Monday Absence",
          severity: "Medium",
          description: `Employee is absent on ${((mondayAbsences / totalMondays) * 100).toFixed(0)}% of Mondays.`
        });
      }

      // 2. Sudden Attendance Drop
      const recent = records.slice(0, 7);
      const past = records.slice(7, 21);
      
      const recentPresent = recent.filter(r => r.status === "Present").length / recent.length;
      const pastPresent = past.filter(r => r.status === "Present").length / past.length;

      if (pastPresent > 0.8 && recentPresent < 0.4) {
        anomalies.push({
          employeeId: emp._id,
          name: emp.name,
          type: "Sudden Attendance Drop",
          severity: "High",
          description: "Attendance rate fell sharply in the last 7 days compared to previous weeks."
        });
      }

      // 3. Irregular Check-ins (Time Variance)
      const checkInHours = records
        .filter(r => r.checkInTime)
        .map(r => new Date(r.checkInTime).getHours() + new Date(r.checkInTime).getMinutes() / 60);
      
      if (checkInHours.length > 5) {
        const mean = checkInHours.reduce((a, b) => a + b) / checkInHours.length;
        const variance = checkInHours.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / checkInHours.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 1.5) { // More than 1.5 hours variation
          anomalies.push({
            employeeId: emp._id,
            name: emp.name,
            type: "Irregular Punch-in Times",
            severity: "Low",
            description: "Check-in times vary significantly, indicating inconsistent schedule adherence."
          });
        }
      }

      // 4. Fake Attendance Pattern (Too Perfect)
      const identicalTimes = records.filter(r => {
        if (!r.checkInTime) return false;
        const t = new Date(r.checkInTime);
        return t.getHours() === 9 && t.getMinutes() === 0;
      }).length;

      if (identicalTimes > 10) {
        anomalies.push({
          employeeId: emp._id,
          name: emp.name,
          type: "Suspiciously Uniform Patterns",
          severity: "Critical",
          description: "Multiple check-ins at exactly 09:00 AM detected. Possible automated or fake entry."
        });
      }
    }

    return anomalies;
  }
}

module.exports = new AIAnomalyDetector();
