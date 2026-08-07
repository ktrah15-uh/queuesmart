/**
 * QueueSmart - Service Management business logic. Owner: Andres.
 *
 * A4: services live in the SQLite `Service` table (id, name, description,
 * expectedDuration, priority, createdAt) instead of an in-memory array. Same
 * exported function names/shapes as A3, so services.routes.js didn't change.
 *
 * NOTE: open/closed is NOT a Service column - that state lives on Alan's
 * `Queue` table instead (see src/data/db.js). Don't add isOpen back here.
 */

const { store } = require('../../data/store');
const { db } = require('../../data/db');
const { ApiError } = require('../../utils/validate');

const selectAll = db.prepare('SELECT * FROM Service ORDER BY id');
const selectById = db.prepare('SELECT * FROM Service WHERE id = ?');
const insertService = db.prepare(`
  INSERT INTO Service (name, description, expectedDuration, priority)
  VALUES (@name, @description, @expectedDuration, @priority)
`);
const updateServiceRow = db.prepare(`
  UPDATE Service
     SET name             = COALESCE(@name, name),
         description      = COALESCE(@description, description),
         expectedDuration = COALESCE(@expectedDuration, expectedDuration),
         priority         = COALESCE(@priority, priority)
   WHERE id = @id
`);
const deleteServiceRow = db.prepare('DELETE FROM Service WHERE id = ?');

function listServices() {
  return selectAll.all();
}

function findService(id) {
  return selectById.get(id) || null;
}

function getServiceById(id) {
  const service = findService(id);
  if (!service) throw new ApiError(404, 'NOT_FOUND', 'Service not found');
  return service;
}

/**
 * Creates a service. `data` is already validated/coerced by validateBody().
 */
function createService({ name, description, expectedDuration, priority }) {
  const info = insertService.run({ name, description, expectedDuration, priority });
  return findService(info.lastInsertRowid);
}

/**
 * Partial update - only fields present in `data` are changed.
 * @throws ApiError 404 if the service doesn't exist.
 */
function updateService(id, data) {
  getServiceById(id); // 404 if missing

  updateServiceRow.run({
    id,
    name: data.name ?? null,
    description: data.description ?? null,
    expectedDuration: data.expectedDuration ?? null,
    priority: data.priority ?? null,
  });
  return findService(id);
}

/**
 * Deletes a service, refusing if anyone is currently waiting in its queue -
 * otherwise those tickets would point at a service that no longer exists.
 *
 * Queue entries are still Alan's in-memory store.queueEntries (A4: TODO on
 * his side to move to the Queue/QueueEntry tables) - once that migrates,
 * this check should move to a DB query too.
 *
 * @throws ApiError 404 if missing, 409 if the queue for it isn't empty.
 */
function deleteService(id) {
  getServiceById(id); // 404 if missing

  const hasWaitingEntries = store.queueEntries.some(
    (entry) => entry.serviceId === id && entry.status === 'waiting'
  );
  if (hasWaitingEntries) {
    throw new ApiError(409, 'CONFLICT', 'Cannot delete a service with people waiting in its queue');
  }

  deleteServiceRow.run(id);
  return { message: 'Service deleted' };
}

module.exports = {
  listServices,
  findService,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
