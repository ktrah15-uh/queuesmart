/**
 * QueueSmart - Tests for the Service Management module. Owner: Andres.
 * A4: services live in the SQLite Service table (tests run against an
 * in-memory DB - see config.js). resetStore() wipes it between tests.
 */
const request = require('supertest');
const app = require('../../app');
const { resetStore } = require('../../data/store');
const { db } = require('../../data/db');
const { signToken } = require('../../middleware/auth');

let userToken;
let adminToken;

function countServices() {
  return db.prepare('SELECT COUNT(*) AS count FROM Service').get().count;
}

beforeEach(() => {
  resetStore();
  userToken = signToken({ id: 1, email: 'student@uh.edu', role: 'user' });
  adminToken = signToken({ id: 2, email: 'admin@uh.edu', role: 'admin' });
});

function createViaApi(overrides = {}) {
  return request(app)
    .post('/api/services')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Financial Aid Advising',
      description: 'Speak with a counselor about grants and loans.',
      expectedDuration: 15,
      priority: 'high',
      ...overrides,
    });
}

describe('GET /api/services', () => {
  test('rejects requests with no token', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(401);
  });

  test('returns an empty array when no services exist', async () => {
    const res = await request(app).get('/api/services').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lists services for any signed-in role', async () => {
    await createViaApi();
    const res = await request(app).get('/api/services').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Financial Aid Advising');
  });
});

describe('GET /api/services/:id', () => {
  test('returns a single service', async () => {
    const created = await createViaApi();
    const res = await request(app)
      .get(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  test('404s for a service that does not exist', async () => {
    const res = await request(app).get('/api/services/999').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/services', () => {
  test('creates a service, persisted in the database with defaults applied', async () => {
    const res = await createViaApi({ priority: undefined });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Financial Aid Advising',
      expectedDuration: 15,
      priority: 'medium',
    });
    expect(typeof res.body.id).toBe('number');
    expect(countServices()).toBe(1);

    // survives being read back fresh from the DB, not just the in-process response
    const row = db.prepare('SELECT * FROM Service WHERE id = ?').get(res.body.id);
    expect(row.name).toBe('Financial Aid Advising');
  });

  test('blocks non-admins with 403', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'X', description: 'Y', expectedDuration: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(countServices()).toBe(0);
  });

  test('rejects requests with no token', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ name: 'X', description: 'Y', expectedDuration: 10 });
    expect(res.status).toBe(401);
  });

  test('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields.name).toBeDefined();
    expect(res.body.error.fields.description).toBeDefined();
    expect(res.body.error.fields.expectedDuration).toBeDefined();
  });

  test('rejects an out-of-range expectedDuration', async () => {
    const res = await createViaApi({ expectedDuration: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.expectedDuration).toBeDefined();
  });

  test('rejects an invalid priority value', async () => {
    const res = await createViaApi({ priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.priority).toBeDefined();
  });
});

describe('PUT /api/services/:id', () => {
  test('partially updates a service, leaving other fields untouched', async () => {
    const created = await createViaApi();

    const res = await request(app)
      .put(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedDuration: 20 });

    expect(res.status).toBe(200);
    expect(res.body.expectedDuration).toBe(20);
    expect(res.body.name).toBe('Financial Aid Advising');

    const row = db.prepare('SELECT * FROM Service WHERE id = ?').get(created.body.id);
    expect(row.expectedDuration).toBe(20);
  });

  test('404s when updating a service that does not exist', async () => {
    const res = await request(app)
      .put('/api/services/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expectedDuration: 20 });

    expect(res.status).toBe(404);
  });

  test('blocks non-admins with 403', async () => {
    const created = await createViaApi();
    const res = await request(app)
      .put(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedDuration: 20 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/services/:id', () => {
  test('deletes a service with an empty queue', async () => {
    const created = await createViaApi();

    const res = await request(app)
      .delete(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(countServices()).toBe(0);
  });

  test('404s when the service does not exist', async () => {
    const res = await request(app).delete('/api/services/999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('refuses to delete a service with people waiting', async () => {
    const created = await createViaApi();
    const userId = db.prepare(
      'INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)'
    ).run('waiting@uh.edu', 'test-hash', 'user').lastInsertRowid;

    const queueId = db.prepare(
      'INSERT INTO Queue (serviceId, status) VALUES (?, ?)'
    ).run(created.body.id, 'open').lastInsertRowid;

    db.prepare(
      'INSERT INTO QueueEntry (queueId, userId, position, priority, status) VALUES (?, ?, ?, ?, ?)'
    ).run(queueId, userId, 1, 'high', 'waiting');

    const res = await request(app)
      .delete(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(countServices()).toBe(1);
  });

  test('blocks non-admins with 403', async () => {
    const created = await createViaApi();
    const res = await request(app)
      .delete(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(countServices()).toBe(1);
  });
});
test('creating a service also opens a queue for it', async () => {
  const created = await createViaApi();
  const queue = db.prepare('SELECT * FROM Queue WHERE serviceId = ?').get(created.body.id);
  expect(queue).toBeDefined();
  expect(queue.status).toBe('open');
});
