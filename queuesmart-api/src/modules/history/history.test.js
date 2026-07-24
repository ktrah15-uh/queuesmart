/**
 * QueueSmart - Tests for history + notifications. David.
 */

const request = require('supertest');
const app = require('../../app');
const { resetStore } = require('../../data/store');
const { signToken } = require('../../middleware/auth');
const historyService = require('./history.service');
const notificationsService = require('../notifications/notifications.service');

let userToken;
let adminToken;

beforeEach(() => {
  resetStore();
  userToken = signToken({ id: 1, email: 'student@uh.edu', role: 'user' });
  adminToken = signToken({ id: 2, email: 'admin@uh.edu', role: 'admin' });
});

describe('history helpers', () => {
  test('recordHistory saves a row', () => {
    const entry = historyService.recordHistory({
      userId: 1,
      serviceId: 3,
      serviceName: 'IT Help Desk',
      outcome: 'served',
    });

    expect(entry.id).toBe(1);
    expect(historyService.listForUser(1)).toHaveLength(1);
    expect(historyService.listForUser(99)).toHaveLength(0);
  });

  test('recordHistory rejects bad outcome', () => {
    expect(() =>
      historyService.recordHistory({
        userId: 1,
        serviceName: 'IT Help Desk',
        outcome: 'skipped',
      })
    ).toThrow('outcome must be served, left, or no-show');
  });
});

describe('GET /api/history', () => {
  test('needs a token', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(401);
  });

  test('only returns the current users rows', async () => {
    historyService.recordHistory({
      userId: 1,
      serviceName: 'Academic Advising',
      outcome: 'served',
    });
    historyService.recordHistory({
      userId: 2,
      serviceName: 'Financial Aid',
      outcome: 'left',
    });

    const res = await request(app)
      .get('/api/history')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].serviceName).toBe('Academic Advising');
  });
});

describe('POST /api/history', () => {
  test('checks outcome', async () => {
    const bad = await request(app)
      .post('/api/history')
      .set('Authorization', 'Bearer ' + userToken)
      .send({ serviceName: 'IT Help Desk', outcome: 'nope' });

    expect(bad.status).toBe(400);
  });

  test('creates a row', async () => {
    const res = await request(app)
      .post('/api/history')
      .set('Authorization', 'Bearer ' + userToken)
      .send({ serviceName: 'Registrar Office', outcome: 'no-show' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(1);
    expect(res.body.outcome).toBe('no-show');
  });
});

describe('GET /api/history/stats', () => {
  test('admin only', async () => {
    historyService.recordHistory({
      userId: 1,
      serviceName: 'Registrar Office',
      outcome: 'served',
    });

    const denied = await request(app)
      .get('/api/history/stats')
      .set('Authorization', 'Bearer ' + userToken);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get('/api/history/stats')
      .set('Authorization', 'Bearer ' + adminToken);
    expect(allowed.status).toBe(200);
    expect(allowed.body.totalVisits).toBe(1);
  });
});

describe('notifications helpers', () => {
  test('notify adds a note', () => {
    const note = notificationsService.notify(5, 'queue_joined', 'You joined');
    expect(note.id).toBe(1);
    expect(notificationsService.listForUser(5)).toHaveLength(1);
  });
});

describe('GET /api/notifications', () => {
  test('needs a token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  test('only returns current users notes', async () => {
    notificationsService.notify(1, 'almost_your_turn', 'Almost your turn');
    notificationsService.notify(2, 'queue_joined', 'Someone else');

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/notifications', () => {
  test('creates a note', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .set('Authorization', 'Bearer ' + userToken)
      .send({ type: 'queue_update', message: 'You are now #2 in line' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('You are now #2 in line');
  });
});

describe('POST /api/notifications/read-all', () => {
  test('marks notes read', async () => {
    notificationsService.notify(1, 'queue_joined', 'Joined');
    notificationsService.notify(1, 'almost_your_turn', 'Almost');

    const res = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
  });
});

describe('DELETE /api/notifications', () => {
  test('clears only that users notes', async () => {
    notificationsService.notify(1, 'queue_joined', 'A note');
    notificationsService.notify(2, 'queue_joined', 'B note');

    const res = await request(app)
      .delete('/api/notifications')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(1);
    expect(notificationsService.listForUser(1)).toHaveLength(0);
    expect(notificationsService.listForUser(2)).toHaveLength(1);
  });
});
