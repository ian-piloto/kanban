const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'kanban.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      priority TEXT CHECK(priority IN ('baixa', 'media', 'alta')) DEFAULT 'media',
      status TEXT CHECK(status IN ('fazer', 'fazendo', 'feito')) DEFAULT 'fazer',
      category TEXT,
      creator_id INTEGER,
      time_spent INTEGER DEFAULT 0,
      allocated_time INTEGER DEFAULT 0,
      last_started_at TEXT,
      completed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(creator_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS task_shares (
      task_id INTEGER,
      user_id INTEGER,
      PRIMARY KEY (task_id, user_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);
  });
}

// Helper para async/await
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = {
  db,
  initDB,
  query,
  run,
  get
};
