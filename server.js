import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import sqlite3 from "sqlite3";
import { GoogleGenAI } from "@google/genai";

// ====== INITIAL SETUP ======
const app = express();
const PORT = 5000;
const upload = multer({ dest: "uploads/" });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ====== DATABASE SETUP ======
const db = new sqlite3.Database("dbmain.db", (err) => {
  if (err) console.error("❌ Database connection failed:", err);
  else console.log("✅ Connected to SQLite database");
});

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT UNIQUE,
    fullName TEXT,
    email TEXT,
    dob TEXT,
    major TEXT,
    password TEXT,
    points INTEGER DEFAULT 0,
    badges TEXT DEFAULT ''
  )
`);

// ====== GOOGLE GEN AI SETUP ======
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyBuwInEcMm8w8fa5CCjCGUsz9P_e5BrjoE",
});

// Convert uploaded file to Gemini input format
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// ====== STUDENT REGISTRATION ======
app.post("/api/register/student", (req, res) => {
  const { studentId, fullName, email, dob, major, password } = req.body;

  if (!studentId || !fullName || !email || !dob || !major) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const sql = `
    INSERT INTO students (studentId, fullName, email, dob, major, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [studentId, fullName, email, dob, major, password], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint")) {
        return res.status(409).json({ error: "Student ID already exists." });
      }
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to register student." });
    }
   
    res.status(201).json({ message: "Student registered successfully", studentId });
  });
});

// GET: Fetch student achievements by studentId
app.get("/api/student/:studentId", (req, res) => {
  const { studentId } = req.params;

  const sql = `SELECT points FROM students WHERE studentId = ?`;
  db.get(sql, [studentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Student not found" });

    res.json({
      points: row.points || 0,
      badges: row.badges ? JSON.parse(row.badges) : [],
    });
  });
});



// ====== FETCH ALL STUDENTS ======
app.get("/api/students", (req, res) => {
  db.all("SELECT * FROM students", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ====== VERIFY TASK WITH GEMINI ======
app.post("/api/verify-task", upload.single("image"), async (req, res) => {
  try {
    const { taskName, taskDescription, studentId, points = 0, badge = "" } = req.body;
    const file = req.file;

    if (!file || !taskName || !studentId) {
      return res.status(400).json({ error: "Missing image, taskName, or studentId" });
    }

    const imagePart = fileToGenerativePart(file.path, file.mimetype);

    // Prompt for Gemini
    const prompt = `
You are an environmental activity verifier.
Check if the uploaded image truly matches the given eco-task.

Respond ONLY in JSON with:
{
  "task": "<task name>",
  "verified": true or false,
  "confidence": <number between 0 and 1>,
  "comment": "<short reasoning>"
}

Task Name: ${taskName}
Task Description: ${taskDescription || "No description provided."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, prompt],
    });

    let jsonResult;
    try {
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

    // ✅ Update student points and badges if verified
    if (jsonResult.verified) {
      db.get("SELECT points, badges FROM students WHERE studentId = ?", [studentId], (err, row) => {
        if (err || !row) {
          console.error("Database error fetching student:", err);
        } else {
          const newPoints = row.points + parseInt(points);
          const currentBadges = row.badges ? row.badges.split(",") : [];
          if (badge && !currentBadges.includes(badge)) currentBadges.push(badge);
          const newBadgesStr = currentBadges.join(",");

          db.run(
            "UPDATE students SET points = ?, badges = ? WHERE studentId = ?",
            [newPoints, newBadgesStr, studentId],
            (err) => {
              if (err) console.error("Failed to update points/badges:", err);
            }
          );
        }
      });
    }

    fs.unlinkSync(file.path);
    res.json(jsonResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 EcoActionHub API running on http://127.0.0.1:${PORT}`);
});
