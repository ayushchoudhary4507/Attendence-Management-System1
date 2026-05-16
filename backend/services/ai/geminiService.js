const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require('../../utils/logger');
const { withRetry } = require('./aiRetryService');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.availableModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]; // Default fallbacks
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.discoverModels();
        }
    }

    async discoverModels() {
        try {
            const axios = require('axios');
            const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            const models = response.data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            
            if (models.length > 0) {
                // Prioritize 'flash' models as they are faster/cheaper
                const flashModels = models.filter(m => m.includes('flash')).sort((a, b) => b.localeCompare(a));
                const proModels = models.filter(m => m.includes('pro')).sort((a, b) => b.localeCompare(a));
                this.availableModels = [...flashModels, ...proModels, ...models];
                logger.info(`Gemini Auto-Discovery: Found ${models.length} models. Primary: ${this.availableModels[0]}`);
            }
        } catch (error) {
            logger.warn(`Gemini Model Discovery failed: ${error.message}. Using defaults.`);
        }
    }

    async generateContent(prompt) {
        if (!this.genAI) {
            throw new Error('Gemini API key is not configured');
        }

        let lastError = null;
        const modelsToTry = this.availableModels.slice(0, 5); // Try top 5 discovered models

        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                if (text) {
                    logger.info(`Gemini Success with discovered model: ${modelName}`);
                    return text;
                }
            } catch (error) {
                lastError = error;
                logger.warn(`Gemini Error [${modelName}]: ${error.message}`);
                if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('supported')) {
                    continue;
                }
                break; 
            }
        }
        throw lastError || new Error('All Gemini models failed');
    }

    async getInsights(dataContext, userQuery = null) {
        const prompt = userQuery 
            ? `
                You are the 'Workforce Intelligence Core', an elite AI HR Executive. 
                Your goal is to answer the USER QUERY with extreme precision using ONLY the provided DATA CONTEXT.

                --- DATA CONTEXT ---
                ${JSON.stringify(dataContext, null, 2)}
                
                --- USER QUERY ---
                "${userQuery}"
                
                --- MANDATORY INSTRUCTIONS ---
                1. ANALYZE TODAY'S DATA: If asked about today, look at 'todayAttendance' and 'todayStats'.
                2. TREND ANALYSIS: If asked about history or patterns, look at 'attendanceHistory'.
                3. PERFORMANCE: If asked about the best or worst performers, look at 'rankings' and 'topPerformers'.
                4. BE SPECIFIC: Mention employee names, departments, and specific percentages/times.
                5. NO HALLUCINATION: If the data is not in the context, say "I don't have enough data to answer that specifically."
                6. TONE: Be professional, concise, and executive-level. Use bullet points for lists.
              `
            : `
                You are the 'Workforce Intelligence Core'. Provide an Executive Analytical Summary of this workforce data.
                ${JSON.stringify(dataContext, null, 2)}
                
                Highlight:
                - Overall stability index.
                - Top 3 high-risk areas/employees.
                - Performance leaders.
                - Actionable HR advice for the next 48 hours.
              `;
        
        return await this.generateContent(prompt);
    }
}

module.exports = new GeminiService();
