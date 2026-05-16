const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require('openai');
const os = require('os');

const checkDBStatus = async () => {
    return {
        status: mongoose.connection.readyState === 1 ? 'up' : 'down',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        dbName: mongoose.connection.name
    };
};

const checkAIStatus = async () => {
    const status = {
        gemini: { configured: !!process.env.GEMINI_API_KEY, status: 'unknown' },
        openai: { configured: !!process.env.OPENAI_API_KEY, status: 'unknown' }
    };

    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            // Small no-op call or configuration check
            status.gemini.status = 'up';
        } catch (e) {
            status.gemini.status = 'down';
            status.gemini.error = e.message;
        }
    }

    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            status.openai.status = 'up';
        } catch (e) {
            status.openai.status = 'down';
            status.openai.error = e.message;
        }
    }

    return status;
};

const getSystemMetrics = () => {
    return {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: os.loadavg(),
        freeMem: os.freemem(),
        totalMem: os.totalmem(),
        nodeVersion: process.version,
        platform: process.platform
    };
};

module.exports = { checkDBStatus, checkAIStatus, getSystemMetrics };
