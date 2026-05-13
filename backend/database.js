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
`);

// Seed data function
const seedData = () => {
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
  if (docCount === 0) {
    const insertDoc = db.prepare('INSERT INTO documents (title, category, status) VALUES (?, ?, ?)');
    insertDoc.run('Annual Report 2023', 'Finance', 'Active');
    insertDoc.run('Marketing Strategy', 'Marketing', 'Draft');
    insertDoc.run('Employee Handbook', 'HR', 'Active');
    insertDoc.run('Project Proposal X', 'Development', 'Archived');
    insertDoc.run('Technical Specs v2', 'Development', 'Active');

    const insertActivity = db.prepare('INSERT INTO activities (user_name, action, document_title, type) VALUES (?, ?, ?, ?)');
    insertActivity.run('John Doe', 'Created', 'Annual Report 2023', 'plus');
    insertActivity.run('Jane Smith', 'Edited', 'Marketing Strategy', 'edit');
    insertActivity.run('Admin', 'Deleted', 'Old Archive', 'trash');
    insertActivity.run('John Doe', 'Updated Status', 'Employee Handbook', 'refresh');
  }
};

seedData();

module.exports = db;
