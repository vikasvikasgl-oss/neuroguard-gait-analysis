import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Target both DB locations so whichever file is opened in DB Browser for SQLite (root or tremor folder), it updates immediately!
const dbPathTremor = path.join(__dirname, 'database.sqlite');
const dbPathRoot = path.join(__dirname, '..', '..', 'database.sqlite');

console.log(`[Express SQLite] Primary DB (Tremor): ${dbPathTremor}`);
console.log(`[Express SQLite] Secondary DB (Root): ${dbPathRoot}`);

const dbTremor = new sqlite3.Database(dbPathTremor);
const dbRoot = new sqlite3.Database(dbPathRoot);

function initDbSchema(dbInstance, dbLabel) {
  dbInstance.serialize(() => {
    dbInstance.run(`
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

    dbInstance.run(`
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

    dbInstance.run(`
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

    // Seed default Patient account
    dbInstance.get('SELECT count(*) as count FROM users', (err, row) => {
      if (!err && row && row.count === 0) {
        const stmt = dbInstance.prepare(`
          INSERT INTO users (username, email, password, full_name, role)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run('john_doe', 'john.doe@example.com', 'patient123', 'John Doe (Patient)', 'Patient');
        stmt.finalize();
        console.log(`[Express SQLite] Seeded default Patient user into ${dbLabel}`);
      }
    });
  });
}

initDbSchema(dbTremor, 'Tremor database.sqlite');
initDbSchema(dbRoot, 'Root database.sqlite');

// Helper to execute query on both database files
function runOnBothDbs(sql, params, callback) {
  let count = 0;
  let lastErr = null;
  let lastResult = null;

  dbTremor.run(sql, params, function(err) {
    if (err) lastErr = err;
    else lastResult = this;
    count++;
    if (count === 2 && callback) callback(lastErr, lastResult);
  });

  dbRoot.run(sql, params, function(err) {
    if (err) lastErr = err;
    else if (!lastResult) lastResult = this;
    count++;
    if (count === 2 && callback) callback(lastErr, lastResult);
  });
}

// 1. Health check & DB info
app.get('/api/db-info', (req, res) => {
  dbRoot.get('SELECT count(*) as count FROM users', (err, row) => {
    res.json({
      status: 'online',
      rootPath: dbPathRoot,
      userCount: row ? row.count : 0
    });
  });
});

// 2. Patient Register Endpoint
app.post('/api/register', (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields are required for Patient Registration.' });
  }

  const role = 'Patient';
  const insertUserSql = `
    INSERT INTO users (username, email, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `;

  runOnBothDbs(insertUserSql, [username, email, password, fullName, role], function (err, result) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Username or email already exists in SQLite DB.' });
      }
      return res.status(500).json({ error: err.message });
    }

    const userId = result ? result.lastID : 1;
    console.log(`[Express SQLite] Registered Patient ID #${userId}: ${username}`);

    // Insert into login_logs on both SQLite databases!
    const logSql = `INSERT INTO login_logs (user_id, username, status, ip_address, login_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    runOnBothDbs(logSql, [userId, username, 'PATIENT_REGISTERED', req.ip || '127.0.0.1']);

    res.status(201).json({
      message: 'Patient account registered & saved to SQLite database (login_logs updated)!',
      user: {
        id: userId,
        username,
        email,
        fullName,
        role: 'Patient'
      }
    });
  });
});

// 3. Patient Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username or Email is required.' });
  }

  const findUserSql = `SELECT * FROM users WHERE username = ? OR email = ?`;

  dbRoot.get(findUserSql, [username, username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    let targetUser = user;

    if (!targetUser) {
      // Auto-register demo patient if logging in for first time
      const demoEmail = username.includes('@') ? username : `${username}@patient.med`;
      const demoName = username.charAt(0).toUpperCase() + username.slice(1) + ' (Patient)';
      const newUserSql = `
        INSERT INTO users (username, email, password, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `;

      runOnBothDbs(newUserSql, [username, demoEmail, password || 'patient123', demoName, 'Patient'], function(err2, res2) {
        const createdId = res2 ? res2.lastID : 1;

        // Record entry in login_logs in SQLite database!
        const logSql = `INSERT INTO login_logs (user_id, username, status, ip_address, login_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        runOnBothDbs(logSql, [createdId, username, 'PATIENT_LOGIN_SUCCESS', req.ip || '127.0.0.1']);

        console.log(`[Express SQLite] Created & logged patient login in login_logs: ${username}`);

        return res.json({
          message: 'Patient login successful! Entry written to login_logs.',
          user: {
            id: createdId,
            username: username,
            email: demoEmail,
            fullName: demoName,
            role: 'Patient'
          }
        });
      });
      return;
    }

    // Update last_login on both DBs
    runOnBothDbs('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [targetUser.id]);

    // Record login entry in login_logs table in SQLite database!
    const logSql = `INSERT INTO login_logs (user_id, username, status, ip_address, login_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    runOnBothDbs(logSql, [targetUser.id, targetUser.username, 'PATIENT_LOGIN_SUCCESS', req.ip || '127.0.0.1']);

    console.log(`[Express SQLite] Recorded patient login in login_logs table for: ${targetUser.username}`);

    res.json({
      message: 'Patient login successful! Entry recorded in login_logs.',
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        fullName: targetUser.full_name,
        role: 'Patient'
      }
    });
  });
});

// 4. Get all login logs (for inspection)
app.get('/api/logs', (req, res) => {
  dbRoot.all('SELECT * FROM login_logs ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: rows.length, logs: rows });
  });
});

// 4b. Save Vitals & Wellness Score to SQLite
app.post('/api/vitals', (req, res) => {
  const {
    username,
    bpSystolic,
    bpDiastolic,
    bloodSugar,
    spo2,
    restingHeartRate,
    hrv,
    bodyTemperature,
    wellnessScore,
    healthStatus
  } = req.body;

  const insertSql = `
    INSERT INTO patient_vitals (
      username, bp_systolic, bp_diastolic, blood_sugar, spo2,
      resting_heart_rate, hrv, body_temperature, wellness_score, health_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    username || 'patient_user',
    bpSystolic || 120,
    bpDiastolic || 80,
    bloodSugar || 95,
    spo2 || 98,
    restingHeartRate || 72,
    hrv || 55,
    bodyTemperature || 98.6,
    wellnessScore || 100,
    healthStatus || 'OPTIMAL WELLNESS'
  ];

  runOnBothDbs(insertSql, params, function (err, result) {
    if (err) {
      console.error('[Express SQLite Vitals Error]', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`[Express SQLite] Saved vitals & wellness score for ${username}: ${wellnessScore}/100`);
    res.status(201).json({
      message: 'Vitals & wellness score saved successfully to SQLite database!',
      vitalsId: result ? result.lastID : 1
    });
  });
});

// 4c. Get Vitals History
app.get('/api/vitals', (req, res) => {
  dbRoot.all('SELECT * FROM patient_vitals ORDER BY id DESC LIMIT 50', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: rows.length, history: rows });
  });
});

// 5. Get available local Ollama models
app.get('/api/ollama-models', async (req, res) => {
  try {
    const tagsRes = await fetch('http://127.0.0.1:11434/api/tags');
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      const modelNames = (data.models || []).map((m) => m.name);
      return res.json({ models: modelNames });
    }
    res.json({ models: [] });
  } catch (err) {
    res.json({ models: [] });
  }
});

// 6. Ollama Local AI Chat Proxy Endpoint
app.post('/api/chat', async (req, res) => {
  const { prompt, messages, model } = req.body;

  try {
    let targetModel = model;

    // Auto-detect model if not specified
    if (!targetModel) {
      try {
        const tagsRes = await fetch('http://127.0.0.1:11434/api/tags');
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          if (tagsData.models && tagsData.models.length > 0) {
            targetModel = tagsData.models[0].name;
          }
        }
      } catch (e) {}
    }
    targetModel = targetModel || 'llama3.2';

    // Call Ollama /api/chat
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        messages: messages || [{ role: 'user', content: prompt }],
        stream: false
      })
    });

    if (ollamaRes.ok) {
      const data = await ollamaRes.json();
      const reply = data.message?.content || data.response || 'No response from Ollama.';
      return res.json({ reply, model: targetModel });
    }

    // Fallback call to Ollama /api/generate
    const genRes = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        prompt: prompt || (messages ? messages[messages.length - 1].content : ''),
        stream: false
      })
    });

    if (genRes.ok) {
      const genData = await genRes.json();
      return res.json({ reply: genData.response, model: targetModel });
    }

    return res.status(500).json({ error: 'Ollama local server returned an error.' });
  } catch (err) {
    console.error('[Ollama Proxy Error]', err.message);
    return res.status(500).json({
      error: 'Unable to reach Ollama on http://127.0.0.1:11434. Please ensure Ollama is running.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[NeuroGuard Express API] Running on http://localhost:${PORT}`);
  console.log(`[SQLite Database File Root] ${dbPathRoot}`);
  console.log(`[Ollama AI Proxy] Configured for http://127.0.0.1:11434`);
});

