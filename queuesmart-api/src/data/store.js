/**
 * QueueSmart - Data store.
 * Owner: Killian.
 *
 * A3 kept every collection in these arrays. In A4 the collections move into
 * SQLite one module at a time (see src/data/db.js for the schema).
 *
 *   MIGRATED : users  -> UserCredentials + UserProfile tables (Killian, done)
 *   MIGRATED : notifications -> Notification (David, done)
 *   MIGRATED : history       -> History      (David, done)
 *   MIGRATED : services      -> Service            (Andres, done)
 *   TODO     : queueEntries  -> Queue + QueueEntry (Alan)
 *
 * Until your collection is migrated it keeps working exactly as it did in A3,
 * so nothing breaks while we move over. resetStore() already clears BOTH the
 * arrays and the database, so your existing beforeEach(resetStore) is fine.
 */

const { db, resetDb } = require('./db');

const store = {
  // Alan - queue
  queueEntries: [], // { id, serviceId, userId, priority, joinedAt, status }
};

const counters = {};

/** Returns a new sequential id for a collection: nextId('services') -> 1, 2, 3... */
function nextId(collection) {
  counters[collection] = (counters[collection] || 0) + 1;
  return counters[collection];
}

/** Wipes every collection AND every database table. Call this in beforeEach(). */
function resetStore() {
  Object.keys(store).forEach((key) => {
    store[key].length = 0;
  });
  Object.keys(counters).forEach((key) => delete counters[key]);
  resetDb();
}

module.exports = { store, nextId, resetStore, db };