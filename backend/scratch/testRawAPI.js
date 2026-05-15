const axios = require("axios");
require("dotenv").config();

async function testAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    console.log("Available models:");
    response.data.models.forEach(m => console.log(` - ${m.name}`));
  } catch (e) {
    console.error("API Call Failed:");
    if (e.response) {
      console.error("Status:", e.response.status);
      console.error("Data:", JSON.stringify(e.response.data, null, 2));
    } else {
      console.error("Error:", e.message);
    }
  }
}

testAPI();
