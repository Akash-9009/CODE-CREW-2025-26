// verify-task.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const upload = multer({ dest: "uploads/" });
const app = express();
const PORT = 5000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyBuwInEcMm8w8fa5CCjCGUsz9P_e5BrjoE",
});

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

app.post("/api/verify-task", upload.single("image"), async (req, res) => {
  try {
    const { taskName, taskDescription } = req.body;
    const file = req.file;

    if (!file || !taskName) {
      return res.status(400).json({ error: "Missing image or taskName" });
    }

    const imagePart = fileToGenerativePart(file.path, file.mimetype);

    // Prompt to Gemini: structured verification request
    const prompt = `
You are a strict environmental task verifier.
Analyze the uploaded image and determine whether it matches the given eco-task description.
Respond ONLY in JSON with fields:
{
  "task": "<task name>",
  "verified": true or false,
  "confidence": <number between 0 and 1>,
  "comment": "<short reasoning>"
}

Task Name: ${taskName}
Task Description: ${taskDescription || "No detailed description provided"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, prompt],
    });

    let jsonResult;

    try {
      // Gemini often returns markdown → clean it
      const cleanText = response.text.replace(/```json|```/g, "").trim();
      jsonResult = JSON.parse(cleanText);
    } catch (err) {
      jsonResult = {
        task: taskName,
        verified: false,
        confidence: 0,
        comment: "Error parsing AI response",
        rawOutput: response.text,
      };
    }

    fs.unlinkSync(file.path); // cleanup

    res.json(jsonResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Eco verification API running on http://127.0.0.1:${PORT}`)
);
