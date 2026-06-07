// your SQLite setup goes here
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'dashboard.db'));

db.excel(`
        CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_url TEXT NOT NULL,
        reaction TEXT CHECK(reaction IN ('like', 'dislike')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_url TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS highlights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_url TEXT NOT NULL,
            text TEXT NOT NULL,
            colour TEXT DEFAULT 'yellow',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS improvement_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
        status TEXT CHECK(status IN ('Pending', 'In Progress', 'Done')) DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

module.exports = db;
