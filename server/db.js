const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ramayana.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database:', DB_PATH);
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Characters table
    db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating characters table:', err.message);
      else console.log('Characters table ready.');
    });

    // Duels table
    db.run(`
      CREATE TABLE IF NOT EXISTS duels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        description TEXT,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating duels table:', err.message);
      else {
        console.log('Duels table ready.');
        // Migration to add day column if it doesn't exist
        db.run('ALTER TABLE duels ADD COLUMN day INTEGER DEFAULT 1', (err) => {});
        // Migration to add order_index column if it doesn't exist
        db.run('ALTER TABLE duels ADD COLUMN order_index INTEGER DEFAULT 0', (err) => {});
      }
    });

    // Duel participants table
    db.run(`
      CREATE TABLE IF NOT EXISTS duel_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        duel_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('rama', 'ravana')),
        is_dead BOOLEAN DEFAULT 0,
        FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating duel_participants table:', err.message);
      else {
        console.log('Duel participants table ready.');
        // Migration to add is_dead column if it doesn't exist
        db.run('ALTER TABLE duel_participants ADD COLUMN is_dead BOOLEAN DEFAULT 0', (err) => {});
      }
    });
  });
}

module.exports = db;
