const geminiService = require('./geminiService');
const openaiService = require('./openaiService');
const fallbackService = require('./aiFallbackService');
const logger = require('../../utils/logger');

class AIAnalyticsEngine {
    async getExecutiveSummary(dataContext, userQuery = null) {
        const provider = process.env.AI_PROVIDER || 'gemini';
        
        // If query is provided, attempt cloud AI first, otherwise fall back to intelligent rule engine
        if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
            try {
                logger.info(`Orchestrating AI response using ${provider}. Query: ${userQuery || 'General Insights'}`);
                
                if (provider === 'openai' && process.env.OPENAI_API_KEY) {
                    return await openaiService.getInsights(dataContext, userQuery);
                } else if (process.env.GEMINI_API_KEY) {
                    return await geminiService.getInsights(dataContext, userQuery);
                }
            } catch (error) {
                logger.warn(`Cloud AI provider (${provider}) failed: ${error.message}. Switching to Natural Language Intelligence Engine.`);
            }
        }

        // Native High-Precision Natural Language Intelligence Engine (Answers any query using live database context)
        if (userQuery) {
            return fallbackService.answerQuery(userQuery, dataContext);
        }
        return fallbackService.generateBasicSummary(dataContext);
    }
}

module.exports = new AIAnalyticsEngine();
