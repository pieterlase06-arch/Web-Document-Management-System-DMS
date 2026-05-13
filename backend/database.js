const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'dms.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    document_title TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT
  );
`);

// Migration check: Ensure users table has all required columns
try {
  db.prepare('SELECT department_id FROM users LIMIT 1').get();
} catch (e) {
  console.log('Migrating users table (adding department_id)...');
  // Ambil data user yang ada dulu agar tidak hilang (opsional, tapi admin harus tetap ada)
  db.exec('DROP TABLE IF EXISTS users');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT,
      department_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Re-seed default admin
  db.prepare('INSERT INTO users (username, password, name, role, department_id) VALUES (?, ?, ?, ?, ?)').run('admin', 'admin123', 'Administrator', 'Admin', 1);
}

// Seed data function
const seedData = () => {
  // Check if seeded
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    // Categories
    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    ['Finance', 'Marketing', 'HR', 'Development', 'Legal'].forEach(name => insertCat.run(name));

    // Departments
    const insertDept = db.prepare('INSERT INTO departments (name) VALUES (?)');
    ['IT Department', 'Finance Department', 'HR Department', 'Operations'].forEach(name => insertDept.run(name));

    // Users
    const insertUser = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', 'admin123', 'Admin User', 'System Admin');
    insertUser.run('john', 'pass123', 'John Doe', 'Editor');
    insertUser.run('jane', 'pass123', 'Jane Smith', 'Viewer');

    // Documents
    const insertDoc = db.prepare('INSERT INTO documents (title, category, status) VALUES (?, ?, ?)');
    insertDoc.run('Annual Report 2023', 'Finance', 'Active');
    insertDoc.run('Marketing Strategy', 'Marketing', 'Draft');
    insertDoc.run('Employee Handbook', 'HR', 'Active');
    insertDoc.run('Project Proposal X', 'Development', 'Archived');
    insertDoc.run('Technical Specs v2', 'Development', 'Active');

    // Activities
    const insertActivity = db.prepare('INSERT INTO activities (user_name, action, document_title, type) VALUES (?, ?, ?, ?)');
    insertActivity.run('Admin User', 'Created', 'Annual Report 2023', 'plus');
    insertActivity.run('John Doe', 'Edited', 'Marketing Strategy', 'edit');
  }
};

seedData();

module.exports = db;
