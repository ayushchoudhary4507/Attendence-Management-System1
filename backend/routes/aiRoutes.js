const express = require('express');
const router = express.Router();
const analyticsService = require('../services/ai/analyticsService');
const predictionService = require('../services/ai/predictionService');
const anomalyDetector = require('../services/ai/anomalyDetector');
const chatbotService = require('../services/ai/chatbotService');
const reportGenerator = require('../services/ai/reportGenerator');
const aiAnalyticsEngine = require('../services/ai/aiAnalyticsEngine');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// 0. AI General Insights
router.get('/insights', async (req, res, next) => {
  try {
    const data = await analyticsService.getGeneralInsights();
    
    // Fetch today's attendance for more context
    const Attendance = require('../models/Attendance');
    const todayAttendance = await Attendance.find({ 
      date: { 
        $gte: new Date().setHours(0,0,0,0), 
        $lte: new Date().setHours(23,59,59,999) 
      } 
    });

    const context = {
      rankings: data.rawStats.rankings,
      highRiskEmployees: data.rawStats.rankings.filter(r => r.overallScore < 60), // Simplified risk check
      recentAnomalies: data.rawStats.anomalies,
      todayAttendance: todayAttendance
    };

    // Use the robust engine for the summary
    const aiSummary = await aiAnalyticsEngine.getExecutiveSummary(context);
    
    res.json({ 
      success: true, 
      data: {
        ...data,
        monthlySummary: aiSummary
      } 
    });
  } catch (error) {
    next(new AppError(`AI Insights Error: ${error.message}`, 500));
  }
});

// 1. AI Chat Assistant
router.post('/chat', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return next(new AppError('Query is required', 400));
    
    const response = await chatbotService.handleQuery(query);
    res.json({ response });
  } catch (error) {
    next(new AppError(`AI Chat Error: ${error.message}`, 500));
  }
});

// 2. Employee Deep Report
router.get('/employee-report/:id', async (req, res, next) => {
  try {
    const analytics = await analyticsService.getEmployeeDeepAnalytics(req.params.id);
    if (!analytics) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json(analytics);
  } catch (error) {
    next(new AppError(`Employee Report Error: ${error.message}`, 500));
  }
});

// 3. Department Comparison
router.get('/department-report/:department', async (req, res, next) => {
  try {
    const report = await analyticsService.getDepartmentComparison();
    res.json(report);
  } catch (error) {
    next(new AppError(`Department Report Error: ${error.message}`, 500));
  }
});

// 4. Absence Predictions
router.get('/predictions', async (req, res, next) => {
  try {
    const predictions = await predictionService.getAbsencePredictions();
    res.json(predictions);
  } catch (error) {
    next(new AppError(`Predictions Error: ${error.message}`, 500));
  }
});

// 5. Anomaly Detection
router.get('/anomalies', async (req, res, next) => {
  try {
    const anomalies = await anomalyDetector.detectAnomalies();
    res.json(anomalies);
  } catch (error) {
    next(new AppError(`Anomalies Error: ${error.message}`, 500));
  }
});

// 6. Performance Ranking
router.get('/performance-ranking', async (req, res, next) => {
  try {
    const rankings = await analyticsService.getPerformanceRankings();
    res.json(rankings);
  } catch (error) {
    next(new AppError(`Ranking Error: ${error.message}`, 500));
  }
});

// 7. Export PDF
router.get('/export/pdf/:id', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${req.params.id}.pdf`);
    await reportGenerator.generateEmployeePDF(req.params.id, res);
  } catch (error) {
    logger.error(`PDF Export Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

// 8. Export DOCX
router.get('/export/docx/:id', async (req, res, next) => {
  try {
    const buffer = await reportGenerator.generateEmployeeDOCX(req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=report-${req.params.id}.docx`);
    res.send(buffer);
  } catch (error) {
    logger.error(`DOCX Export Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate DOCX' });
  }
});

// 9. Export Intelligence Report (System-wide)
router.get('/export/intelligence-report', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=AI-Intelligence-Report.pdf');
    await reportGenerator.generateIntelligenceReportPDF(res);
  } catch (error) {
    logger.error(`Intelligence Report Export Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate Intelligence Report' });
  }
});

module.exports = router;
