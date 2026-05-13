require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const app = express();
const PORT = process.env.PORT || 7860; // Port default Hugging Face adalah 7860

app.use(cors());
app.use(express.json());

// --- Authentication ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    try {
        // Gunakan LOWER() untuk case-insensitive login
        const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?').get(username, password);
        if (user) {
            res.json({ success: true, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ error: 'Username atau password salah' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Melayani file statis dari folder frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// GET /api/stats : Menghitung total dokumen, dokumen aktif, dll.
app.get('/api/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const active = db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = "Active"').get().count;
    const draft = db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = "Draft"').get().count;
    const archived = db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = "Archived"').get().count;

    // For Chart.js
    const categories = db.prepare('SELECT category, COUNT(*) as count FROM documents GROUP BY category').all();

    res.json({
      total,
      active,
      draft,
      archived,
      categories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents : Mengambil semua daftar dokumen.
app.get('/api/documents', (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents : Menambah dokumen baru.
app.post('/api/documents', (req, res) => {
  const { title, category, status } = req.body;
  if (!title || !category || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const info = db.prepare('INSERT INTO documents (title, category, status) VALUES (?, ?, ?)').run(title, category, status);
    
    // Log activity
    db.prepare('INSERT INTO activities (user_name, action, document_title, type) VALUES (?, ?, ?, ?)').run(
      'System User', 'Added', title, 'plus'
    );

    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id : Menghapus dokumen.
app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  try {
    const doc = db.prepare('SELECT title FROM documents WHERE id = ?').get(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    // Log activity
    db.prepare('INSERT INTO activities (user_name, action, document_title, type) VALUES (?, ?, ?, ?)').run(
      'System User', 'Deleted', doc.title, 'trash'
    );

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activities : Mengambil daftar aktivitas terakhir.
app.get('/api/activities', (req, res) => {
  try {
    const activities = db.prepare('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 10').all();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy chat request to AI Provider (Groq, Silicon Flow, etc.)
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  
  // Ambil konfigurasi dari Environment Variables
  const AI_API_KEY = process.env.AI_API_KEY || process.env.NINEROUTER_KEY;
  const AI_API_URL = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const AI_MODEL = process.env.AI_MODEL || 'llama3-8b-8192';

  if (!AI_API_KEY) {
    return res.status(500).json({ error: 'AI_API_KEY belum dikonfigurasi di Hugging Face Secrets.' });
  }

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages
      })
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      console.error('AI Provider Error:', text);
      res.status(500).json({ error: 'AI Provider mengembalikan format non-JSON. Pastikan URL dan API Key benar.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan Koneksi: ' + err.message });
  }
});

// --- Master Data Endpoints ---

app.get('/api/categories', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM categories').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM departments').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT u.*, d.name as department_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id
        `).all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`  DMS SERVER IS STARTING UP...`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Address: 0.0.0.0`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`=========================================`);
});
