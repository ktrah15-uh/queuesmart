/**
 * QueueSmart - History. David.
 */

const { store, nextId } = require('../../data/store');
const { ApiError } = require('../../utils/validate');

const OUTCOMES = ['served', 'left', 'no-show'];

function recordHistory({ userId, serviceId, serviceName, joinedAt, outcome }) {
  if (userId === undefined || userId === null) {
    throw new ApiError(400, 'BAD_REQUEST', 'userId is required');
  }
  if (!serviceName) {
    throw new ApiError(400, 'BAD_REQUEST', 'serviceName is required');
  }
  if (!OUTCOMES.includes(outcome)) {
    throw new ApiError(400, 'BAD_REQUEST', 'outcome must be served, left, or no-show');
  }

  const entry = {
    id: nextId('history'),
    userId: userId,
    serviceId: serviceId || null,
    serviceName: serviceName,
    joinedAt: joinedAt || new Date().toISOString(),
    endedAt: new Date().toISOString(),
    outcome: outcome,
  };

  store.history.push(entry);
  return entry;
}

function listForUser(userId) {
  const rows = [];
  for (let i = 0; i < store.history.length; i++) {
    if (store.history[i].userId === userId) {
      rows.push(store.history[i]);
    }
  }
  return rows;
}

function getStats() {
  const byOutcome = { served: 0, left: 0, 'no-show': 0 };
  const serviceCounts = {};

  for (let i = 0; i < store.history.length; i++) {
    const h = store.history[i];
    if (byOutcome[h.outcome] !== undefined) {
      byOutcome[h.outcome] = byOutcome[h.outcome] + 1;
    }
    if (!serviceCounts[h.serviceName]) {
      serviceCounts[h.serviceName] = 0;
    }
    serviceCounts[h.serviceName] = serviceCounts[h.serviceName] + 1;
  }

  const byService = [];
  for (const name in serviceCounts) {
    byService.push({ serviceName: name, count: serviceCounts[name] });
  }

  return {
    totalVisits: store.history.length,
    byOutcome: byOutcome,
    byService: byService,
  };
}

module.exports = { recordHistory, listForUser, getStats, OUTCOMES };
