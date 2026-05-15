const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
require("dotenv").config();

let genAI = null;
let cachedModels = null;
let lastModelUpdate = 0;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error("Gemini API Key is missing or not configured in .env");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Fetch available flash models from Google API
 */
const fetchAvailableModels = async () => {
  const now = Date.now();
  if (cachedModels && now - lastModelUpdate < 3600000) { // Cache for 1 hour
    return cachedModels;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(url);
    
    const flashModels = response.data.models
      .filter(m => m.name.includes("flash") && m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace("models/", ""));
    
    // Prioritize 'gemini-flash-latest' as requested, then stable models
    flashModels.sort((a, b) => {
      if (a === 'gemini-flash-latest') return -1;
      if (b === 'gemini-flash-latest') return 1;
      const aIsStable = !a.includes("preview") && !a.includes("exp");
      const bIsStable = !b.includes("preview") && !b.includes("exp");
      if (aIsStable && !bIsStable) return -1;
      if (!aIsStable && bIsStable) return 1;
      return 0;
    });

    cachedModels = flashModels;
    lastModelUpdate = now;
    console.log("✅ AI Service: Available flash models:", flashModels);
    return flashModels;
  } catch (error) {
    console.error("⚠️ AI Service: Failed to fetch model list, using defaults.");
    return ["gemini-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
  }
};

/**
 * Try to generate content using multiple model fallbacks
 */
const generateWithFallback = async (prompt, isChat = false) => {
  const modelsToTry = await fetchAvailableModels();
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 AI Service: Attempting with model: ${modelName}`);
      const model = getGenAI().getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const status = error.status || (error.response && error.response.status);
      
      if (status === 429) {
        console.warn(`⚠️ AI Service: Model ${modelName} hit quota limit. Trying next...`);
        continue;
      }
      
      if (status === 404) {
        console.warn(`⚠️ AI Service: Model ${modelName} not found. Trying next...`);
        continue;
      }

      // If it's a different error, we might want to stop or continue
      console.error(`❌ AI Service: Error with ${modelName}:`, error.message);
      if (modelsToTry.indexOf(modelName) === modelsToTry.length - 1) throw error;
    }
  }

  throw lastError || new Error("All models failed to respond.");
};

/**
 * Data Fetching Logic (Same as before)
 */
const getAttendanceContext = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [attendanceRecords, employees] = await Promise.all([
      Attendance.find({ date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }),
      Employee.find({ status: 'Active' })
    ]);

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp._id.toString()] = {
        name: emp.name,
        department: emp.designation || emp.department || 'Unknown'
      };
    });

    const stats = {};
    attendanceRecords.forEach(rec => {
      const emp = employeeMap[rec.employeeId.toString()];
      if (!emp) return;
      if (!stats[emp.name]) stats[emp.name] = { present: 0, late: 0, total: 0, dept: emp.department };
      stats[emp.name].total++;
      if (rec.status === 'Present') stats[emp.name].present++;
      if (rec.checkInTime && new Date(rec.checkInTime).getHours() >= 9 && new Date(rec.checkInTime).getMinutes() > 30) {
        stats[emp.name].late++;
      }
    });
    return stats;
  } catch (error) {
    throw error;
  }
};

const generateInsights = async () => {
  try {
    const stats = await getAttendanceContext();
    if (Object.keys(stats).length === 0) {
      return { monthlySummary: "No data found for the last 30 days." };
    }

    const prompt = `Analyze: ${JSON.stringify(stats)}. Provide frequentAbsentees, latePatterns, departmentPerformance, suspiciousBehavior, monthlySummary. JSON format.`;
    const responseText = await generateWithFallback(prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { monthlySummary: responseText };
  } catch (error) {
    console.error("AI Insights Error:", error.message);
    throw error;
  }
};

const chatWithAI = async (query) => {
  try {
    const stats = await getAttendanceContext();
    const prompt = `Context: ${JSON.stringify(stats)}. Query: ${query}. Answer clearly.`;
    return await generateWithFallback(prompt, true);
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    return "I'm having trouble reaching the AI service. Please check if your API key has enough quota.";
  }
};

module.exports = { generateInsights, chatWithAI };
