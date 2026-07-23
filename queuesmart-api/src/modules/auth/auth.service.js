/**
 * QueueSmart - Auth business logic. Owner: Killian.
 */

const bcrypt = require('bcryptjs');
const { store, nextId } = require('../../data/store');
const { ApiError } = require('../../utils/validate');
const { BCRYPT_ROUNDS } = require('../../config');

function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function findByEmail(email) {
  if (!email) return null;
  const target = String(email).toLowerCase();
  return store.users.find((u) => u.email === target) || null;
}

function findById(id) {
  return store.users.find((u) => u.id === id) || null;
}

/**
 * Registers a new account.
 * @param {{name:string,email:string,password:string,role:string}} data - already
 *   validated by validateBody(), so no shape-checking needed here.
 * @throws ApiError 409 if the email is taken.
 */

function register({ name, email, password, role }) {
  if (findByEmail(email)) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const user = {
    id: nextId('users'),
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
    role: role || 'user',
    // A1 said email verification is design-only, so we record the flag but
    // never block login on it.
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  return toPublicUser(user);
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
  return store.users.map(toPublicUser);
}

module.exports = { register, login, findByEmail, findById, listUsers, toPublicUser };