// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.resolve(__dirname, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('✅ Connected to SQLite database');
});

// Create the student table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT UNIQUE,
      fullName TEXT,
      email TEXT,
      dob TEXT,
      major TEXT,
      password TEXT
    )
  `);
});

module.exports = db;
