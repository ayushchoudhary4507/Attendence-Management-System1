const logger = require('../../utils/logger');

class AIFallbackService {
    generateBasicSummary(dataContext) {
        logger.info('Generating fallback analytics summary');
        
        const { rankings = [], highRiskEmployees = [], recentAnomalies = [], todayAttendance = [] } = dataContext;
        
        const summary = [
            `Workforce Status: ${rankings.length} employees tracked.`,
            `Performance: Average overall score is ${this.calculateAvg(rankings)}%.`,
            `Attendance Today: ${todayAttendance.filter(a => a.status === 'Present').length} present, ${todayAttendance.filter(a => a.status === 'Absent').length} absent.`,
            highRiskEmployees.length > 0 ? `Alert: ${highRiskEmployees.length} employees identified with high absence risk.` : 'Workforce stability is high.',
            recentAnomalies.length > 0 ? `Notice: ${recentAnomalies.length} behavior anomalies detected recently.` : 'No significant behavioral anomalies detected.'
        ];

        return summary.join(' ');
    }

    calculateAvg(rankings) {
        if (!rankings || rankings.length === 0) return 0;
        const sum = rankings.reduce((acc, r) => acc + (parseFloat(r.overallScore) || 0), 0);
        return (sum / rankings.length).toFixed(2);
    }
}

module.exports = new AIFallbackService();
