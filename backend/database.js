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
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );
`);

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
    const insertUser = db.prepare('INSERT INTO users (name, role, department_id) VALUES (?, ?, ?)');
    insertUser.run('Admin User', 'System Admin', 1);
    insertUser.run('John Doe', 'Editor', 2);
    insertUser.run('Jane Smith', 'Viewer', 3);

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
