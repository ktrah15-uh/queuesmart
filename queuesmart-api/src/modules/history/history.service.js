/**
 * QueueSmart - History. David.
 */

const { db } = require('../../data/db');
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

  const user = db.prepare('SELECT id FROM UserCredentials WHERE id = ?').get(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  let knownServiceId = null;
  if (serviceId) {
    const service = db.prepare('SELECT id FROM Service WHERE id = ?').get(serviceId);
    if (service) {
      knownServiceId = service.id;
    }
  }

  const joined = joinedAt || new Date().toISOString();
  const ended = new Date().toISOString();

  const info = db
    .prepare(
      'INSERT INTO History (userId, serviceId, serviceName, joinedAt, endedAt, outcome) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(userId, knownServiceId, serviceName, joined, ended, outcome);

  return {
    id: info.lastInsertRowid,
    userId: userId,
    serviceId: knownServiceId,
    serviceName: serviceName,
    joinedAt: joined,
    endedAt: ended,
    outcome: outcome,
  };
}

function listForUser(userId) {
  return db.prepare('SELECT * FROM History WHERE userId = ? ORDER BY id').all(userId);
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) AS count FROM History').get();

  const byOutcome = { served: 0, left: 0, 'no-show': 0 };
  const outcomeRows = db
    .prepare('SELECT outcome, COUNT(*) AS count FROM History GROUP BY outcome')
    .all();
  for (let i = 0; i < outcomeRows.length; i++) {
    if (byOutcome[outcomeRows[i].outcome] !== undefined) {
      byOutcome[outcomeRows[i].outcome] = outcomeRows[i].count;
    }
  }

  const byService = [];
  const serviceRows = db
    .prepare('SELECT serviceName, COUNT(*) AS count FROM History GROUP BY serviceName')
    .all();
  for (let i = 0; i < serviceRows.length; i++) {
    byService.push({ serviceName: serviceRows[i].serviceName, count: serviceRows[i].count });
  }

  return {
    totalVisits: total.count,
    byOutcome: byOutcome,
    byService: byService,
  };
}

module.exports = { recordHistory, listForUser, getStats, OUTCOMES };
