/**
 * QueueSmart - Notifications. David.
 */

const { store, nextId } = require('../../data/store');
const { ApiError } = require('../../utils/validate');

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

  const note = {
    id: nextId('notifications'),
    userId: userId,
    type: type,
    message: message,
    createdAt: new Date().toISOString(),
    read: false,
  };

  store.notifications.unshift(note);
  return note;
}

function listForUser(userId) {
  const notes = [];
  for (let i = 0; i < store.notifications.length; i++) {
    if (store.notifications[i].userId === userId) {
      notes.push(store.notifications[i]);
    }
  }
  return notes;
}

function markAllRead(userId) {
  let count = 0;
  for (let i = 0; i < store.notifications.length; i++) {
    if (store.notifications[i].userId === userId && store.notifications[i].read === false) {
      store.notifications[i].read = true;
      count = count + 1;
    }
  }
  return count;
}

function clearAll(userId) {
  let removed = 0;
  for (let i = store.notifications.length - 1; i >= 0; i--) {
    if (store.notifications[i].userId === userId) {
      store.notifications.splice(i, 1);
      removed = removed + 1;
    }
  }
  return removed;
}

module.exports = { notify, listForUser, markAllRead, clearAll };
