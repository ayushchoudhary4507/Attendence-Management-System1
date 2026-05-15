const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // There is no direct listModels in the JS SDK's main class usually, 
    // it's part of the GenerativeAI interface but let's try a common model name.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (e) {
    console.error("Failed with gemini-1.5-flash:", e.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-pro-latest:", result.response.text());
  } catch (e) {
    console.error("Failed with gemini-1.5-pro-latest:", e.message);
  }
}

listModels();
