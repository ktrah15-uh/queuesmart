/**
 * QueueSmart - SQLite database connection + schema. Owner: Killian (A4).
 *
 * TEAM: this file is the ONLY place that opens the database. In your module do:
 *
 *   const { db } = require('../../data/db');
 *
 *   const rows = db.prepare('SELECT * FROM Service').all();          // many rows
 *   const row  = db.prepare('SELECT * FROM Service WHERE id = ?').get(id); // one row
 *   const info = db.prepare('INSERT INTO Service (name) VALUES (?)').run(name);
 *   info.lastInsertRowid  // <- the new id
 *
 * better-sqlite3 is SYNCHRONOUS, so none of your functions need async/await.
 *
 * In tests, call resetDb() in beforeEach() (resetStore() already does this for you).
 *
 * NOTE: foreign keys are enforced. If you insert a QueueEntry with a userId that
 * has no row in UserCredentials you will get "FOREIGN KEY constraint failed" -
 * create the parent row (user / service / queue) in your test first.
 */

const Database = require('better-sqlite3');
const { DB_FILE } = require('../config');

const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Full schema for QueueSmart. Every table from the A4 spec is created here so
 * that each teammate's module has its table ready on day one.
 */
const SCHEMA = `
-- 1. UserCredentials (Killian) - authentication only, never plain passwords.
CREATE TABLE IF NOT EXISTS UserCredentials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  passwordHash  TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user', 'admin')),
  emailVerified INTEGER NOT NULL DEFAULT 0
                        CHECK (emailVerified IN (0, 1)),
  createdAt     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 2. UserProfile (Killian) - 1:1 with UserCredentials.
CREATE TABLE IF NOT EXISTS UserProfile (
  userId       INTEGER PRIMARY KEY
                       REFERENCES UserCredentials(id) ON DELETE CASCADE,
  fullName     TEXT    NOT NULL
                       CHECK (length(fullName) BETWEEN 2 AND 100),
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE
                       REFERENCES UserCredentials(email) ON UPDATE CASCADE,
  contactPhone TEXT,
  preferences  TEXT,
  updatedAt    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 3. Service (Andres)
CREATE TABLE IF NOT EXISTS Service (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL
                           CHECK (length(name) BETWEEN 1 AND 100),
  description      TEXT    NOT NULL,
  expectedDuration INTEGER NOT NULL
                           CHECK (expectedDuration > 0),
  priority         TEXT    NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high')),
  createdAt        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 4. Queue (Alan) - one open queue per service.
CREATE TABLE IF NOT EXISTS Queue (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  serviceId INTEGER NOT NULL
                    REFERENCES Service(id) ON DELETE CASCADE,
  status    TEXT    NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
  createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 5. QueueEntry (Alan) - one row per person waiting.
CREATE TABLE IF NOT EXISTS QueueEntry (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  queueId  INTEGER NOT NULL REFERENCES Queue(id) ON DELETE CASCADE,
  userId   INTEGER NOT NULL REFERENCES UserCredentials(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  joinTime TEXT    NOT NULL DEFAULT (datetime('now')),
  priority TEXT    NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  status   TEXT    NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'served', 'canceled'))
);

-- 6. Notification (David)
CREATE TABLE IF NOT EXISTS Notification (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES UserCredentials(id) ON DELETE CASCADE,
  type      TEXT    NOT NULL,
  message   TEXT    NOT NULL CHECK (length(message) <= 500),
  createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
  status    TEXT    NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'viewed'))
);

-- 7. History (David) - completed queue participation.
CREATE TABLE IF NOT EXISTS History (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      INTEGER NOT NULL REFERENCES UserCredentials(id) ON DELETE CASCADE,
  serviceId   INTEGER          REFERENCES Service(id) ON DELETE SET NULL,
  serviceName TEXT    NOT NULL,
  joinedAt    TEXT    NOT NULL,
  endedAt     TEXT,
  outcome     TEXT    NOT NULL
                      CHECK (outcome IN ('served', 'left', 'no-show'))
);

CREATE INDEX IF NOT EXISTS idx_queueentry_queue  ON QueueEntry (queueId, status, position);
CREATE INDEX IF NOT EXISTS idx_queueentry_user   ON QueueEntry (userId, status);
CREATE INDEX IF NOT EXISTS idx_notification_user ON Notification (userId, createdAt);
CREATE INDEX IF NOT EXISTS idx_history_user      ON History (userId, joinedAt);
`;

db.exec(SCHEMA);

/** Every table, children before parents. */
const TABLES = [
  'History',
  'Notification',
  'QueueEntry',
  'Queue',
  'Service',
  'UserProfile',
  'UserCredentials',
];

/** Deletes every row and restarts the id counters. Used by tests only. */
function resetDb() {
  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    for (const table of TABLES) db.prepare(`DELETE FROM ${table}`).run();
    db.prepare(`DELETE FROM sqlite_sequence`).run();
  })();
  db.pragma('foreign_keys = ON');
}

module.exports = { db, resetDb, SCHEMA, TABLES };