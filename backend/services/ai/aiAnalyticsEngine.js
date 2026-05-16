const geminiService = require('./geminiService');
const openaiService = require('./openaiService');
const fallbackService = require('./aiFallbackService');
const logger = require('../../utils/logger');

class AIAnalyticsEngine {
    async getExecutiveSummary(dataContext, userQuery = null) {
        const provider = process.env.AI_PROVIDER || 'gemini';
        
        try {
            logger.info(`Orchestrating AI response using ${provider} provider. Query: ${userQuery || 'General Insights'}`);
            
            if (provider === 'openai') {
                return await openaiService.getInsights(dataContext, userQuery);
            } else {
                return await geminiService.getInsights(dataContext, userQuery);
            }
        } catch (error) {
            logger.error(`AI Orchestration failed for ${provider}: ${error.message}`);
            
            // Try fallback provider if primary fails
            try {
                if (provider === 'gemini' && process.env.OPENAI_API_KEY) {
                    logger.info('Attempting secondary AI provider: openai');
                    return await openaiService.getInsights(dataContext, userQuery);
                }
            } catch (secondaryError) {
                logger.error(`Secondary AI provider also failed: ${secondaryError.message}`);
            }

            // Ultimate fallback to basic rule-based analytics
            if (userQuery) {
                return "The AI service is currently unavailable to answer specific questions, but here is a basic summary of the data: " + fallbackService.generateBasicSummary(dataContext);
            }
            return fallbackService.generateBasicSummary(dataContext);
        }
    }
}

module.exports = new AIAnalyticsEngine();
