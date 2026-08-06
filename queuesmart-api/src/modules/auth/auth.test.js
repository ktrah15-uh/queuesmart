/**
 * QueueSmart - Tests for the auth module. Owner: Killian.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { resetStore, db } = require('../../data/store');
const { signToken, requireAuth, requireRole } = require('../../middleware/auth');
const { JWT_SECRET } = require('../../config');
const authService = require('./auth.service');
const { SCHEMA } = require('../../data/db');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

/** How many accounts are in the database right now. */
function countUsers() {
    return db.prepare('SELECT COUNT(*) AS n FROM UserCredentials').get().n;
}

/** The raw UserCredentials row, hash included - tests only. */
function credentialsRow(email) {
    return db.prepare('SELECT * FROM UserCredentials WHERE email = ?').get(email);
}

const VALID_USER = {
    name: 'Killian Trahan',
    email: 'killian@uh.edu',
    password: 'password123',
};

beforeEach(() => {
    resetStore();
});

describe('POST /api/auth/register', () => {
    test('creates a user and returns 201 with a token', async () => {
        const res = await request(app).post('/api/auth/register').send(VALID_USER);

        expect(res.status).toBe(201);
        expect(res.body.user).toMatchObject({
            id: 1,
            name: 'Killian Trahan',
            email: 'killian@uh.edu',
            role: 'user',
            emailVerified: false,
        });
        expect(typeof res.body.token).toBe('string');
        expect(countUsers()).toBe(1);
    });

    test('never returns the password or its hash', async () => {
        const res = await request(app).post('/api/auth/register').send(VALID_USER);

        expect(res.body.user.passwordHash).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toContain('password123');
    });

    test('stores a hash, not the plain password', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);

        const row = credentialsRow('killian@uh.edu');
        expect(row.passwordHash).toBeDefined();
        expect(row.passwordHash).not.toBe('password123');
        expect(row.passwordHash.startsWith('$2')).toBe(true); // a bcrypt hash
    });

    test('lowercases the email and defaults the role to user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, email: 'KILLIAN@UH.EDU' });

        expect(res.body.user.email).toBe('killian@uh.edu');
        expect(res.body.user.role).toBe('user');
    });

    test('accepts an explicit admin role', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, role: 'admin' });

        expect(res.body.user.role).toBe('admin');
    });
});

describe('POST /api/auth/register - validation', () => {
    test('rejects an empty body with one error per missing field', async () => {
        const res = await request(app).post('/api/auth/register').send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(Object.keys(res.body.error.fields).sort())
            .toEqual(['email', 'name', 'password']);
        expect(countUsers()).toBe(0);
    });

    test.each([
        ['name too short', { name: 'K' }],
        ['name too long', { name: 'a'.repeat(101) }],
        ['malformed email', { email: 'not-an-email' }],
        ['password too short', { password: 'short12' }],
        ['unknown role', { role: 'superuser' }],
    ])('rejects %s', async (_label, override) => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, ...override });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('rejects a duplicate email with 409', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, name: 'Someone Else' });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('EMAIL_TAKEN');
        expect(countUsers()).toBe(1);
    });

    test('treats a differently-cased email as the same account', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, email: 'KILLIAN@UH.EDU' });

        expect(res.status).toBe(409);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);
    });

    test('returns 200 with the user and a token on correct credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: VALID_USER.password });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('killian@uh.edu');
        expect(res.body.user.passwordHash).toBeUndefined();
        expect(typeof res.body.token).toBe('string');
    });

    test('accepts a differently-cased email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'KILLIAN@UH.EDU', password: VALID_USER.password });

        expect(res.status).toBe(200);
    });

    test('rejects a wrong password with 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('gives an identical response for an unknown email', async () => {
        const unknown = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@uh.edu', password: VALID_USER.password });
        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: 'wrongpassword' });

        expect(unknown.status).toBe(401);
        expect(unknown.body).toEqual(wrongPassword.body);
    });

    test('rejects a missing email or password with 400', async () => {
        const res = await request(app).post('/api/auth/login').send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('issues a token carrying the id, email and role', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: VALID_USER.password });

        const payload = jwt.verify(res.body.token, JWT_SECRET);
        expect(payload.sub).toBe(res.body.user.id);
        expect(payload.email).toBe('killian@uh.edu');
        expect(payload.role).toBe('user');
        expect(payload.exp).toBeGreaterThan(payload.iat);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);
    });

    test('returns 200 with the user and a token on correct credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: VALID_USER.password });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('killian@uh.edu');
        expect(res.body.user.passwordHash).toBeUndefined();
        expect(typeof res.body.token).toBe('string');
    });

    test('accepts a differently-cased email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'KILLIAN@UH.EDU', password: VALID_USER.password });

        expect(res.status).toBe(200);
    });

    test('rejects a wrong password with 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('gives an identical response for an unknown email', async () => {
        const unknown = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@uh.edu', password: VALID_USER.password });
        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: 'wrongpassword' });

        expect(unknown.status).toBe(401);
        expect(unknown.body).toEqual(wrongPassword.body);
    });

    test('rejects a missing email or password with 400', async () => {
        const res = await request(app).post('/api/auth/login').send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('issues a token carrying the id, email and role', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_USER.email, password: VALID_USER.password });

        const payload = jwt.verify(res.body.token, JWT_SECRET);
        expect(payload.sub).toBe(res.body.user.id);
        expect(payload.email).toBe('killian@uh.edu');
        expect(payload.role).toBe('user');
        expect(payload.exp).toBeGreaterThan(payload.iat);
    });
});

describe('GET /api/auth/me', () => {
    test('returns the current user for a valid token', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${registered.body.token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(registered.body.user.id);
        expect(res.body.user.passwordHash).toBeUndefined();
    });

    test('returns 404 if the account no longer exists', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);
        db.prepare('DELETE FROM UserCredentials').run();

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${registered.body.token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});

describe('requireAuth middleware', () => {
    test('rejects a request with no Authorization header', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test.each([
        ['wrong scheme', 'Basic abc123'],
        ['missing token', 'Bearer'],
        ['garbage token', 'Bearer not.a.real.token'],
    ])('rejects %s with 401', async (_label, header) => {
        const res = await request(app).get('/api/auth/me').set('Authorization', header);

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('rejects a token signed with the wrong secret', async () => {
        const forged = jwt.sign({ sub: 1, role: 'admin' }, 'not-our-secret');

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${forged}`);

        expect(res.status).toBe(401);
    });

    test('rejects an expired token', async () => {
        const expired = jwt.sign({ sub: 1, role: 'user' }, JWT_SECRET, { expiresIn: '-1s' });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expired}`);

        expect(res.status).toBe(401);
    });
});

describe('requireRole middleware', () => {
    function run(user, ...roles) {
        const req = user ? { user } : {};
        const next = jest.fn();
        requireRole(...roles)(req, {}, next);
        return next.mock.calls[0][0];
    }

    test('allows a matching role', () => {
        const next = jest.fn();
        requireRole('admin')({ user: { id: 1, role: 'admin' } }, {}, next);
        expect(next).toHaveBeenCalledWith();
    });

    test('rejects a non-matching role with 403 FORBIDDEN', () => {
        const err = run({ id: 1, role: 'user' }, 'admin');
        expect(err.status).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
    });

    test('accepts any one of several allowed roles', () => {
        const next = jest.fn();
        requireRole('admin', 'user')({ user: { id: 1, role: 'user' } }, {}, next);
        expect(next).toHaveBeenCalledWith();
    });

    test('returns 401 when requireAuth did not run first', () => {
        const err = run(null, 'admin');
        expect(err.status).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });
});

describe('signToken', () => {
    test('produces a token requireAuth accepts', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);
        const token = signToken({ id: registered.body.user.id, email: VALID_USER.email, role: 'user' });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });
});

/* ------------------------------------------------------------------ *
 * A4 - database layer
 * ------------------------------------------------------------------ */

describe('A4: database persistence', () => {
    test('register writes one UserCredentials row and one UserProfile row', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);

        const credentials = db.prepare('SELECT * FROM UserCredentials').all();
        const profiles = db.prepare('SELECT * FROM UserProfile').all();

        expect(credentials).toHaveLength(1);
        expect(profiles).toHaveLength(1);
        expect(profiles[0].userId).toBe(credentials[0].id);
        expect(profiles[0].fullName).toBe('Killian Trahan');
        expect(profiles[0].email).toBe('killian@uh.edu');
    });

    test('the profile is not written when the credentials insert fails', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);
        await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, name: 'Someone Else' });

        expect(db.prepare('SELECT COUNT(*) AS n FROM UserProfile').get().n).toBe(1);
    });

    test('a registered user can be read back out of the database after the request ends', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);

        const stored = authService.findById(registered.body.user.id);

        expect(stored.email).toBe('killian@uh.edu');
        expect(stored.name).toBe('Killian Trahan');
    });

    test('deleting the credentials row cascades to the profile', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);

        db.prepare('DELETE FROM UserCredentials WHERE email = ?').run('killian@uh.edu');

        expect(db.prepare('SELECT COUNT(*) AS n FROM UserProfile').get().n).toBe(0);
    });

    test('data written to a database file is still there after reopening it', () => {
        const file = path.join(os.tmpdir(), `queuesmart-test-${Date.now()}.db`);

        const first = new Database(file);
        first.exec(SCHEMA);
        first.prepare(
            `INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)`
        ).run('persist@uh.edu', 'hashed', 'admin');
        first.close();

        const second = new Database(file);
        const row = second.prepare('SELECT * FROM UserCredentials WHERE email = ?').get('persist@uh.edu');
        second.close();
        fs.rmSync(file, { force: true });

        expect(row.email).toBe('persist@uh.edu');
        expect(row.role).toBe('admin');
    });
});

describe('A4: database constraints', () => {
    test('the UNIQUE index rejects a duplicate email even when the service is bypassed', () => {
        const insert = db.prepare(
            `INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)`
        );
        insert.run('dupe@uh.edu', 'hash', 'user');

        expect(() => insert.run('DUPE@uh.edu', 'other-hash', 'user')).toThrow(/UNIQUE/i);
    });

    test('the role column rejects a value outside user/admin', () => {
        expect(() =>
            db.prepare(`INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)`)
                .run('bad@uh.edu', 'hash', 'superuser')
        ).toThrow(/CHECK/i);
    });

    test('a profile cannot point at a user that does not exist', () => {
        expect(() =>
            db.prepare(
                `INSERT INTO UserProfile (userId, fullName, email) VALUES (?, ?, ?)`
            ).run(999, 'Ghost User', 'ghost@uh.edu')
        ).toThrow(/FOREIGN KEY/i);
    });

    test('email and password are required at the database level', () => {
        expect(() =>
            db.prepare(`INSERT INTO UserCredentials (email, passwordHash) VALUES (?, ?)`)
                .run(null, 'hash')
        ).toThrow(/NOT NULL/i);
    });
});

describe('A4: updateProfile', () => {
    test('updates the profile fields and leaves the credentials alone', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);
        const id = registered.body.user.id;

        const updated = authService.updateProfile(id, {
            name: 'Killian T.',
            contactPhone: '713-555-0100',
        });

        expect(updated.name).toBe('Killian T.');
        expect(updated.contactPhone).toBe('713-555-0100');
        expect(updated.email).toBe('killian@uh.edu');
        expect(updated.passwordHash).toBeUndefined();
    });

    test('leaves a field untouched when it is not supplied', async () => {
        const registered = await request(app).post('/api/auth/register').send(VALID_USER);

        authService.updateProfile(registered.body.user.id, { contactPhone: '713-555-0100' });
        const updated = authService.updateProfile(registered.body.user.id, {});

        expect(updated.name).toBe('Killian Trahan');
        expect(updated.contactPhone).toBe('713-555-0100');
    });

    test('throws 404 for an unknown user', () => {
        expect(() => authService.updateProfile(999, { name: 'Nobody' })).toThrow(/no longer exists/i);
    });
});

describe('listUsers', () => {
    test('returns every account without any password hashes', async () => {
        await request(app).post('/api/auth/register').send(VALID_USER);
        await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_USER, email: 'admin@uh.edu', role: 'admin' });

        const users = authService.listUsers();

        expect(users).toHaveLength(2);
        expect(users.map((u) => u.role)).toEqual(['user', 'admin']);
        expect(JSON.stringify(users)).not.toContain('passwordHash');
    });
});