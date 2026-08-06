/**
 * QueueSmart - Notifications. David.
 */

const { db } = require('../../data/db');
const { ApiError } = require('../../utils/validate');

function toNote(row) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    message: row.message,
    createdAt: row.createdAt,
    read: row.status === 'viewed',
  };
}

function notify(userId, type, message) {
  if (userId === undefined || userId === null) {
    throw new ApiError(400, 'BAD_REQUEST', 'userId is required');
  }
  if (!type) {
    throw new ApiError(400, 'BAD_REQUEST', 'type is required');
  }
  if (!message) {
    throw new ApiError(400, 'BAD_REQUEST', 'message is required');
  }

  const user = db.prepare('SELECT id FROM UserCredentials WHERE id = ?').get(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  const createdAt = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO Notification (userId, type, message, createdAt) VALUES (?, ?, ?, ?)')
    .run(userId, type, message, createdAt);

  return {
    id: info.lastInsertRowid,
    userId: userId,
    type: type,
    message: message,
    createdAt: createdAt,
    read: false,
  };
}

function listForUser(userId) {
  const rows = db
    .prepare('SELECT * FROM Notification WHERE userId = ? ORDER BY id DESC')
    .all(userId);

  const notes = [];
  for (let i = 0; i < rows.length; i++) {
    notes.push(toNote(rows[i]));
  }
  return notes;
}

function markAllRead(userId) {
  const info = db
    .prepare("UPDATE Notification SET status = 'viewed' WHERE userId = ? AND status = 'sent'")
    .run(userId);
  return info.changes;
}

function clearAll(userId) {
  const info = db.prepare('DELETE FROM Notification WHERE userId = ?').run(userId);
  return info.changes;
}

module.exports = { notify, listForUser, markAllRead, clearAll };
