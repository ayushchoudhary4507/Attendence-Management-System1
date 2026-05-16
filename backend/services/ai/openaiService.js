const OpenAI = require('openai');
const logger = require('../../utils/logger');
const { withRetry } = require('./aiRetryService');

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (this.apiKey) {
            this.openai = new OpenAI({
                apiKey: this.apiKey,
            });
        }
    }

    async generateContent(prompt, systemPrompt = "You are an HR AI Assistant.") {
        if (!this.openai) {
            throw new Error('OpenAI API key is not configured');
        }

        return await withRetry(async () => {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5,
                max_tokens: 800,
            });
            return response.choices[0].message.content;
        });
    }

    async getInsights(dataContext, userQuery = null) {
        const systemPrompt = `
            You are the 'Workforce Intelligence Core', an elite AI HR Executive. 
            Analyze workforce data with extreme precision.
            MANDATORY: 
            - Answer ONLY based on provided data.
            - Mention specific names, departments, and percentages.
            - If data is missing, say you don't have enough information.
            - Use a professional, executive tone.
        `;

        const userPrompt = userQuery 
            ? `USER QUERY: "${userQuery}"\n\nDATA CONTEXT:\n${JSON.stringify(dataContext, null, 2)}`
            : `Provide an Executive Analytical Summary for this data:\n${JSON.stringify(dataContext, null, 2)}`;
        
        return await this.generateContent(userPrompt, systemPrompt);
    }
}

module.exports = new OpenAIService();
