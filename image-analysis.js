// image-analysis.js
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

// Initialize Gemini
const ai = new GoogleGenAI({
  // Optional: If you haven’t set GEMINI_API_KEY env variable
  apiKey: "AIzaSyBuwInEcMm8w8fa5CCjCGUsz9P_e5BrjoE"
});

// Helper function to convert image file into Generative Part
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function analyzeImage() {
  try {
    // Replace with your image path
    const imagePart = fileToGenerativePart("./sample.jpg", "image/jpeg");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Best for general multimodal reasoning
      contents: [
        imagePart,
        "Describe the objects, scene, and possible actions happening in this image."
      ],
    });

    console.log("🔍 Analysis Result:\n");
    console.log(response.text);
  } catch (error) {
    console.error("❌ Error analyzing image:", error);
  }
}

analyzeImage();
