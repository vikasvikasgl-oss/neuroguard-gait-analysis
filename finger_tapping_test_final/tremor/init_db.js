import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPathTremor = path.join(__dirname, 'database.sqlite');
const dbPathRoot = path.join(__dirname, '..', '..', 'database.sqlite');

function setupDatabase(filePath, label) {
  console.log(`[SQLite Init] Setting up DB Browser compatible SQLite database at (${label}): ${filePath}`);
  const db = new sqlite3.Database(filePath);

  db.serialize(() => {
    // 1. Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'Patient',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // 2. Create Login Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        ip_address TEXT,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // 3. Create Patient Vitals Table
    db.run(`
      CREATE TABLE IF NOT EXISTS patient_vitals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        bp_systolic INTEGER NOT NULL,
        bp_diastolic INTEGER NOT NULL,
        blood_sugar REAL NOT NULL,
        spo2 REAL NOT NULL,
        resting_heart_rate INTEGER NOT NULL,
        hrv REAL NOT NULL,
        body_temperature REAL NOT NULL,
        wellness_score REAL NOT NULL,
        health_status TEXT NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Insert Default Demo Patient User
    const userStmt = db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    userStmt.run('john_doe', 'john.doe@example.com', 'patient123', 'John Doe (Patient)', 'Patient');
    userStmt.finalize();

    // 4. Insert Initial Record into login_logs
    const logStmt = db.prepare(`
      INSERT INTO login_logs (user_id, username, status, ip_address, login_time)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    logStmt.run(1, 'john_doe', 'PATIENT_INITIAL_LOGIN', '127.0.0.1');
    logStmt.finalize();

    console.log(`[SQLite Init] Tables 'users' & 'login_logs' initialized in ${label}!`);
  });

  db.close();
}

setupDatabase(dbPathTremor, 'Tremor folder');
setupDatabase(dbPathRoot, 'Root folder (DB Browser target)');
