/**
 * QueueSmart - In-memory data store (A3: no real database yet).
 * Owner: Killian. Each module owns one collection.
 *
 * A4 swaps this file's internals for a real database. Keep ALL data access
 * going through this module so that swap only touches one file.
 */

const store = {
  // Killian - auth
  users: [], // { id, name, email, passwordHash, role, emailVerified, createdAt }

  // Andres - service management
  services: [], // { id, name, description, expectedDuration, priority, isOpen, createdAt }

  // Alan - queue
  queueEntries: [], // { id, serviceId, userId, priority, joinedAt, status }

  // David - notifications + history
  notifications: [], // { id, userId, type, message, createdAt, read }
  history: [], // { id, userId, serviceId, serviceName, joinedAt, endedAt, outcome }
};

const counters = {};

/** Returns a new sequential id for a collection: nextId('users') -> 1, 2, 3... */
function nextId(collection) {
  counters[collection] = (counters[collection] || 0) + 1;
  return counters[collection];
}

/** Wipes every collection. Call this in beforeEach() in your tests. */
function resetStore() {
  Object.keys(store).forEach((key) => {
    store[key].length = 0;
  });
  Object.keys(counters).forEach((key) => delete counters[key]);
}

module.exports = { store, nextId, resetStore };