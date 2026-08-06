/**
 * QueueSmart - Auth business logic. Owner: Killian.
 *
 * A4: accounts now live in SQLite (UserCredentials + UserProfile) instead of an
 * in-memory array. The functions below keep the exact same names, arguments and
 * return shapes as A3, so the routes, the middleware and the front end did not
 * have to change.
 */

const bcrypt = require('bcryptjs');
const { db } = require('../../data/db');
const { ApiError } = require('../../utils/validate');
const { BCRYPT_ROUNDS } = require('../../config');

// A credentials row joined to its profile row, shaped like the A3 user object.
const SELECT_USER = `
  SELECT c.id            AS id,
         p.fullName      AS name,
         c.email         AS email,
         c.passwordHash  AS passwordHash,
         c.role          AS role,
         c.emailVerified AS emailVerified,
         c.createdAt     AS createdAt,
         p.contactPhone  AS contactPhone,
         p.preferences   AS preferences
  FROM UserCredentials c
  LEFT JOIN UserProfile p ON p.userId = c.id
`;

/** SQLite has no boolean type, so 0/1 comes back out as a real boolean. */
function fromRow(row) {
  if (!row) return null;
  return { ...row, emailVerified: Boolean(row.emailVerified) };
}

function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function findByEmail(email) {
  if (!email) return null;
  const row = db.prepare(`${SELECT_USER} WHERE c.email = ?`).get(String(email).toLowerCase());
  return fromRow(row);
}

function findById(id) {
  const row = db.prepare(`${SELECT_USER} WHERE c.id = ?`).get(id);
  return fromRow(row);
}

const insertCredentials = db.prepare(`
  INSERT INTO UserCredentials (email, passwordHash, role, emailVerified, createdAt)
  VALUES (@email, @passwordHash, @role, 0, @createdAt)
`);

const insertProfile = db.prepare(`
  INSERT INTO UserProfile (userId, fullName, email, contactPhone, preferences, updatedAt)
  VALUES (@userId, @fullName, @email, @contactPhone, @preferences, @updatedAt)
`);

/** Both inserts succeed together or neither does. */
const createAccount = db.transaction((data) => {
  const info = insertCredentials.run({
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: data.createdAt,
  });
  insertProfile.run({
    userId: info.lastInsertRowid,
    fullName: data.name,
    email: data.email,
    contactPhone: data.contactPhone ?? null,
    preferences: data.preferences ?? null,
    updatedAt: data.createdAt,
  });
  return info.lastInsertRowid;
});

/**
 * Registers a new account.
 * @param {{name:string,email:string,password:string,role:string}} data - already
 *   validated by validateBody(), so no shape-checking needed here.
 * @throws ApiError 409 if the email is taken.
 */
function register({ name, email, password, role, contactPhone, preferences }) {
  const normalisedEmail = String(email).toLowerCase();

  if (findByEmail(normalisedEmail)) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  let id;
  try {
    id = createAccount({
      name,
      email: normalisedEmail,
      passwordHash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: role || 'user',
      createdAt: new Date().toISOString(),
      contactPhone,
      preferences,
    });
  } catch (err) {
    // Belt and braces: the UNIQUE index catches a duplicate even if two
    // requests slip past the findByEmail check at the same time.
    if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw err;
  }

  return toPublicUser(findById(id));
}

/**
 * Verifies credentials.
 * @throws ApiError 401 on a bad email OR a bad password - deliberately the same
 *   message either way, so the response can't be used to discover which emails
 *   have accounts.
 */
function login({ email, password }) {
  const user = findByEmail(email);
  const ok = user && bcrypt.compareSync(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  return toPublicUser(user);
}

function listUsers() {
  return db.prepare(`${SELECT_USER} ORDER BY c.id`).all().map((row) => toPublicUser(fromRow(row)));
}

/** Updates the profile half of an account. Returns the updated public user. */
function updateProfile(id, { name, contactPhone, preferences }) {
  const user = findById(id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User no longer exists');

  db.prepare(`
    UPDATE UserProfile
       SET fullName     = COALESCE(@fullName, fullName),
           contactPhone = COALESCE(@contactPhone, contactPhone),
           preferences  = COALESCE(@preferences, preferences),
           updatedAt    = @updatedAt
     WHERE userId = @userId
  `).run({
    userId: id,
    fullName: name ?? null,
    contactPhone: contactPhone ?? null,
    preferences: preferences ?? null,
    updatedAt: new Date().toISOString(),
  });

  return toPublicUser(findById(id));
}

module.exports = {
  register,
  login,
  findByEmail,
  findById,
  listUsers,
  updateProfile,
  toPublicUser,
};