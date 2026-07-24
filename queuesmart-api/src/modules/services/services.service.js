/**
 * QueueSmart - Service Management business logic. Owner: Andres.
 */

const { store, nextId } = require('../../data/store');
const { ApiError } = require('../../utils/validate');

// returns every service, newest first isn't required - keep insertion order
function listServices() {
  return store.services;
}

function findService(id) {
  return store.services.find((s) => s.id === id) || null;
}

function getServiceById(id) {
  const service = findService(id);
  if (!service) throw new ApiError(404, 'NOT_FOUND', 'Service not found');
  return service;
}

/**
 * Creates a service. `data` is already validated/coerced by validateBody().
 * New services always start open.
 */
function createService({ name, description, expectedDuration, priority }) {
  const service = {
    id: nextId('services'),
    name,
    description,
    expectedDuration,
    priority,
    isOpen: true,
    createdAt: new Date().toISOString(),
  };

  store.services.push(service);
  return service;
}

/**
 * Partial update - only fields present in `data` are changed.
 * @throws ApiError 404 if the service doesn't exist.
 */
function updateService(id, data) {
  const service = getServiceById(id);
  Object.assign(service, data);
  return service;
}

/**
 * Deletes a service, refusing if anyone is currently waiting in its queue -
 * otherwise those tickets would point at a service that no longer exists.
 * @throws ApiError 404 if missing, 409 if the queue for it isn't empty.
 */
function deleteService(id) {
  const service = getServiceById(id);

  const hasWaitingEntries = store.queueEntries.some(
    (entry) => entry.serviceId === id && entry.status === 'waiting'
  );
  if (hasWaitingEntries) {
    throw new ApiError(409, 'CONFLICT', 'Cannot delete a service with people waiting in its queue');
  }

  const index = store.services.indexOf(service);
  store.services.splice(index, 1);
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
