/**
 * Tests for the reporting module. Owner: Killian.
 * Resets the in-memory DB, inserts fixtures, asserts on the aggregates.
 */

const request = require('supertest');
const app = require('../../app');
const { db, resetDb } = require('../../data/db');
const { signToken } = require('../../middleware/auth');
const reports = require('./reports.service');

/* ---------------- fixtures ---------------- */

function insertUser(email, fullName, role = 'user') {
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)`)
    .run(email, 'hash', role);
  db.prepare(`INSERT INTO UserProfile (userId, fullName, email) VALUES (?, ?, ?)`)
    .run(lastInsertRowid, fullName, email);
  return lastInsertRowid;
}

function insertService(name, expectedDuration = 10, priority = 'medium') {
  return db
    .prepare(`INSERT INTO Service (name, description, expectedDuration, priority)
              VALUES (?, ?, ?, ?)`)
    .run(name, `${name} desc`, expectedDuration, priority).lastInsertRowid;
}

function insertHistory({ userId, serviceId, serviceName, joinedAt, endedAt = null, outcome = 'served' }) {
  return db
    .prepare(`INSERT INTO History (userId, serviceId, serviceName, joinedAt, endedAt, outcome)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, serviceId, serviceName, joinedAt, endedAt, outcome).lastInsertRowid;
}

const NO_FILTERS = { from: null, to: null, serviceId: null };

let alice, bob, advising, itdesk;

beforeEach(() => {
  resetDb();
  alice = insertUser('alice@example.com', 'Alice Johnson');
  bob = insertUser('bob@example.com', 'Bob Smith');
  advising = insertService('Academic Advising', 20, 'high');
  itdesk = insertService('IT Help Desk', 10, 'medium');

  // Alice: two served visits to advising - 20 min and 40 min waits
  insertHistory({ userId: alice, serviceId: advising, serviceName: 'Academic Advising',
    joinedAt: '2026-08-01 09:00:00', endedAt: '2026-08-01 09:20:00', outcome: 'served' });
  insertHistory({ userId: alice, serviceId: advising, serviceName: 'Academic Advising',
    joinedAt: '2026-08-05 11:00:00', endedAt: '2026-08-05 11:40:00', outcome: 'served' });
  // Bob: one abandoned IT visit
  insertHistory({ userId: bob, serviceId: itdesk, serviceName: 'IT Help Desk',
    joinedAt: '2026-08-05 13:00:00', endedAt: '2026-08-05 13:05:00', outcome: 'left' });
});

/* ---------------- filters ---------------- */

describe('normalizeFilters', () => {
  test('accepts valid filters', () => {
    const { errors, filters } = reports.normalizeFilters({
      from: '2026-08-01', to: '2026-08-31', serviceId: '2',
    });
    expect(errors).toHaveLength(0);
    expect(filters).toMatchObject({ from: '2026-08-01', to: '2026-08-31', serviceId: 2 });
  });

  test('rejects a malformed date', () => {
    expect(reports.normalizeFilters({ from: '08/01/2026' }).errors[0].field).toBe('from');
  });

  test('rejects a non-numeric serviceId', () => {
    expect(reports.normalizeFilters({ serviceId: 'abc' }).errors[0].field).toBe('serviceId');
  });

  test('rejects an inverted date range', () => {
    expect(reports.normalizeFilters({ from: '2026-08-10', to: '2026-08-01' }).errors[0].field).toBe('to');
  });

  test('treats an empty query as no filters', () => {
    expect(reports.normalizeFilters({}).filters).toEqual(NO_FILTERS);
  });
});

/* ---------------- summary ---------------- */

describe('getSummary', () => {
  test('counts outcomes and unique users', () => {
    const s = reports.getSummary(NO_FILTERS);
    expect(s.totalEntries).toBe(3);
    expect(s.served).toBe(2);
    expect(s.left).toBe(1);
    expect(s.uniqueUsers).toBe(2);
  });

  test('averages wait over served entries only', () => {
    // 20 and 40 -> 30. Bob's 5-minute abandon must not count.
    expect(reports.getSummary(NO_FILTERS).avgWaitMinutes).toBe(30);
  });

  test('date range narrows the result set', () => {
    const s = reports.getSummary({ from: '2026-08-05', to: '2026-08-05', serviceId: null });
    expect(s.totalEntries).toBe(2);
  });

  test('service filter narrows the result set', () => {
    const s = reports.getSummary({ from: null, to: null, serviceId: itdesk });
    expect(s.totalEntries).toBe(1);
    expect(s.served).toBe(0);
  });

  test('returns a null average when nothing was served', () => {
    const s = reports.getSummary({ from: '2020-01-01', to: '2020-01-02', serviceId: null });
    expect(s.totalEntries).toBe(0);
    expect(s.avgWaitMinutes).toBeNull();
  });

  test('counts people currently waiting', () => {
    const queueId = db.prepare(`INSERT INTO Queue (serviceId, status) VALUES (?, 'open')`)
      .run(advising).lastInsertRowid;
    db.prepare(`INSERT INTO QueueEntry (queueId, userId, position, status)
                VALUES (?, ?, 1, 'waiting')`).run(queueId, bob);
    expect(reports.getSummary(NO_FILTERS).currentlyWaiting).toBe(1);
  });
});

/* ---------------- users report ---------------- */

describe('getUsersReport', () => {
  test('includes every user, even one with no activity', () => {
    insertUser('carol@example.com', 'Carol Davis');
    const rows = reports.getUsersReport(NO_FILTERS);
    expect(rows).toHaveLength(3);
    const carol = rows.find((r) => r.email === 'carol@example.com');
    expect(carol.timesJoined).toBe(0);
    expect(carol.avgWaitMinutes).toBeNull();
  });

  test('keeps users visible when a date filter excludes their visits', () => {
    // filters live in the JOIN, not the WHERE - otherwise the row vanishes
    const rows = reports.getUsersReport({ from: '2020-01-01', to: '2020-01-02', serviceId: null });
    expect(rows).toHaveLength(2);
    expect(rows[0].timesJoined).toBe(0);
  });

  test('aggregates participation per user', () => {
    const a = reports.getUsersReport(NO_FILTERS).find((r) => r.email === 'alice@example.com');
    expect(a.fullName).toBe('Alice Johnson');
    expect(a.timesJoined).toBe(2);
    expect(a.served).toBe(2);
    expect(a.avgWaitMinutes).toBe(30);
    expect(a.lastActivity).toBe('2026-08-05 11:00:00');
  });

  test('sorts the busiest user first', () => {
    expect(reports.getUsersReport(NO_FILTERS)[0].email).toBe('alice@example.com');
  });
});

/* ---------------- services report ---------------- */

describe('getServicesReport', () => {
  test('reports demand and outcomes per service', () => {
    const adv = reports.getServicesReport(NO_FILTERS).find((r) => r.serviceId === advising);
    expect(adv.totalEntries).toBe(2);
    expect(adv.served).toBe(2);
    expect(adv.priority).toBe('high');
    expect(adv.expectedDuration).toBe(20);
  });

  test('counts people currently waiting and reports queue status', () => {
    const queueId = db.prepare(`INSERT INTO Queue (serviceId, status) VALUES (?, 'open')`)
      .run(advising).lastInsertRowid;
    db.prepare(`INSERT INTO QueueEntry (queueId, userId, position, status)
                VALUES (?, ?, 1, 'waiting')`).run(queueId, bob);
    const adv = reports.getServicesReport(NO_FILTERS).find((r) => r.serviceId === advising);
    expect(adv.currentlyWaiting).toBe(1);
    expect(adv.queueStatus).toBe('open');
  });

  test('lists services that have no history', () => {
    const empty = insertService('Registrar Office');
    const row = reports.getServicesReport(NO_FILTERS).find((r) => r.serviceId === empty);
    expect(row.totalEntries).toBe(0);
  });
});

/* ---------------- participation report ---------------- */

describe('getParticipationReport', () => {
  test('returns one row per visit, newest first', () => {
    const rows = reports.getParticipationReport(NO_FILTERS);
    expect(rows).toHaveLength(3);
    expect(rows[0].joinedAt).toBe('2026-08-05 13:00:00');
  });

  test('computes wait minutes per row', () => {
    const rows = reports.getParticipationReport({ from: null, to: null, serviceId: itdesk });
    expect(rows[0].waitMinutes).toBe(5);
    expect(rows[0].outcome).toBe('left');
    expect(rows[0].fullName).toBe('Bob Smith');
  });
});

/* ---------------- dispatch ---------------- */

describe('getReport', () => {
  test('dispatches on report type', () => {
    expect(reports.getReport('users', NO_FILTERS)[0]).toHaveProperty('timesJoined');
    expect(reports.getReport('services', NO_FILTERS)[0]).toHaveProperty('serviceName');
    expect(reports.getReport('participation', NO_FILTERS)[0]).toHaveProperty('outcome');
  });

  test('throws for an unknown type', () => {
    expect(() => reports.getReport('nope', NO_FILTERS)).toThrow(/Unknown report type/);
  });
});

/* ---------------- CSV ---------------- */

describe('toCsv', () => {
  test('writes a header row even with no data', () => {
    const csv = reports.toCsv('services', []);
    expect(csv.split('\r\n')).toHaveLength(1);
    expect(csv).toContain('Service');
  });

  test('writes one line per record', () => {
    const rows = reports.getUsersReport(NO_FILTERS);
    const lines = reports.toCsv('users', rows).split('\r\n');
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines[1]).toContain('alice@example.com');
  });

  test('escapes commas and quotes', () => {
    const csv = reports.toCsv('services', [{ serviceName: 'Advising, Room "A"' }]);
    expect(csv).toContain('"Advising, Room ""A"""');
  });

  test('renders null cells as empty', () => {
    expect(reports.toCsv('services', [{ serviceName: null }]).split('\r\n')[1]).toContain(',,');
  });
});

/* ---------------- PDF ---------------- */

describe('writePdf', () => {
  test('produces a valid PDF stream', (done) => {
    const { PassThrough } = require('stream');
    const chunks = [];
    const sink = new PassThrough();
    sink.on('data', (c) => chunks.push(c));
    sink.on('end', () => {
      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      done();
    });

    const rows = reports.getServicesReport(NO_FILTERS);
    reports.writePdf('services', rows, NO_FILTERS, reports.getSummary(NO_FILTERS), sink);
  });

  test('handles an empty result set', (done) => {
    const { PassThrough } = require('stream');
    const sink = new PassThrough();
    sink.on('data', () => {});
    sink.on('end', () => done());
    reports.writePdf('users', [], NO_FILTERS, null, sink);
  });
});

/* ---------------- filename ---------------- */

test('filename is stamped with the current date', () => {
  expect(reports.filename('users', 'csv')).toMatch(/^queuesmart-users-\d{4}-\d{2}-\d{2}\.csv$/);
});

/* ---------------- routes ---------------- */

describe('reports routes', () => {
  const adminAuth = () => {
    const id = insertUser('admin@example.com', 'Admin User', 'admin');
    return `Bearer ${signToken({ id, email: 'admin@example.com', role: 'admin' })}`;
  };
  const userAuth = () =>
    `Bearer ${signToken({ id: alice, email: 'alice@example.com', role: 'user' })}`;

  test('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/reports/summary');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('rejects a non-admin user', async () => {
    const res = await request(app).get('/api/reports/services').set('Authorization', userAuth());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('returns the summary for an admin', async () => {
    const res = await request(app).get('/api/reports/summary').set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.summary.totalEntries).toBe(3);
  });

  test('returns each report type', async () => {
    const auth = adminAuth();
    for (const type of ['users', 'services', 'participation']) {
      const res = await request(app).get(`/api/reports/${type}`).set('Authorization', auth);
      expect(res.status).toBe(200);
      expect(res.body.type).toBe(type);
      expect(res.body.count).toBe(res.body.rows.length);
    }
  });

  test('applies filters passed on the query string', async () => {
    const res = await request(app)
      .get(`/api/reports/participation?from=2026-08-05&to=2026-08-05&serviceId=${itdesk}`)
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.rows[0].email).toBe('bob@example.com');
  });

  test('404s on an unknown report type', async () => {
    const res = await request(app).get('/api/reports/nonsense').set('Authorization', adminAuth());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REPORT_NOT_FOUND');
  });

  test('400s on a malformed filter', async () => {
    const res = await request(app)
      .get('/api/reports/users?from=notadate')
      .set('Authorization', adminAuth());
    expect(res.status).toBe(400);
  });

  test('400s on an unsupported export format', async () => {
    const res = await request(app)
      .get('/api/reports/users/export?format=xlsx')
      .set('Authorization', adminAuth());
    expect(res.status).toBe(400);
  });

  test('exports CSV with a download header', async () => {
    const res = await request(app)
      .get('/api/reports/services/export?format=csv')
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="queuesmart-services-/);
    expect(res.text.split('\r\n')[0]).toContain('Service');
  });

  test('exports PDF', async () => {
    const res = await request(app)
      .get('/api/reports/participation/export?format=pdf')
      .set('Authorization', adminAuth())
      .buffer()
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('defaults to CSV when no format is given', async () => {
    const res = await request(app)
      .get('/api/reports/users/export')
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });
});