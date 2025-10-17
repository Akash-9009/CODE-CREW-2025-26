// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// Create upload handler
const upload = multer({ dest: "uploads/" });
const app = express();
const PORT = 5000;

// Initialize Gemini API
const ai = new GoogleGenAI({
  // optional: if GEMINI_API_KEY env var not set
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyBuwInEcMm8w8fa5CCjCGUsz9P_e5BrjoE"
});

// Helper: convert file to inline data
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// POST endpoint for image analysis
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    const { prompt } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePart = fileToGenerativePart(imageFile.path, imageFile.mimetype);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        imagePart,
        prompt || "Describe this image in detail",
      ],
    });

    // Clean up uploaded file
    fs.unlinkSync(imageFile.path);

    res.json({
      result: response.text,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`)
);
