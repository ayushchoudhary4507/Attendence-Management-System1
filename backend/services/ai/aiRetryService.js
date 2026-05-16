const logger = require('../../utils/logger');

/**
 * Executes an async function with exponential backoff retry logic
 */
const withRetry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        
        // Don't retry on certain errors (like 401 Unauthorized or 400 Bad Request)
        if (error.response && [401, 400, 403].includes(error.response.status)) {
            throw error;
        }

        logger.warn(`Retrying AI request... (${retries} attempts left). Error: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff
        return withRetry(fn, retries - 1, delay * 2);
    }
};

module.exports = { withRetry };
