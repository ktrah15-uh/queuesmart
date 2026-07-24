/**
 * QueueSmart - Tests for the Service Management module. Owner: Andres.
 */
const request = require('supertest');
const app = require('../../app');
const { store, resetStore } = require('../../data/store');
const { signToken } = require('../../middleware/auth');

let userToken;
let adminToken;

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
  test('creates a service with defaults applied', async () => {
    const res = await createViaApi({ priority: undefined });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Financial Aid Advising',
      expectedDuration: 15,
      priority: 'medium',
      isOpen: true,
    });
    expect(typeof res.body.id).toBe('number');
    expect(store.services).toHaveLength(1);
  });

  test('blocks non-admins with 403', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'X', description: 'Y', expectedDuration: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(store.services).toHaveLength(0);
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
  });

  test('can close a service via isOpen', async () => {
    const created = await createViaApi();

    const res = await request(app)
      .put(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isOpen: false });

    expect(res.status).toBe(200);
    expect(res.body.isOpen).toBe(false);
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
    expect(store.services).toHaveLength(0);
  });

  test('404s when the service does not exist', async () => {
    const res = await request(app).delete('/api/services/999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('refuses to delete a service with people waiting', async () => {
    const created = await createViaApi();
    store.queueEntries.push({
      id: 1,
      serviceId: created.body.id,
      userId: 1,
      status: 'waiting',
      joinedAt: new Date().toISOString(),
      priority: 'high',
    });

    const res = await request(app)
      .delete(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(store.services).toHaveLength(1);
  });

  test('blocks non-admins with 403', async () => {
    const created = await createViaApi();
    const res = await request(app)
      .delete(`/api/services/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(store.services).toHaveLength(1);
  });
});
