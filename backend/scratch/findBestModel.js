const axios = require("axios");
require("dotenv").config();

async function findModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    const flashModels = response.data.models
      .filter(m => m.name.includes("flash"))
      .map(m => m.name);
    
    console.log("Flash models found:", flashModels);
    
    if (flashModels.length > 0) {
      // Pick the first one that looks stable
      const best = flashModels.find(m => !m.includes("preview") && !m.includes("exp")) || flashModels[0];
      console.log("BEST_MODEL=" + best.replace("models/", ""));
    }
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

findModel();
