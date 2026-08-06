/**
 * QueueSmart - Configuration. Owner: Killian.
 */
const path = require('path');

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'queuesmart-dev-secret-a3',
  BCRYPT_ROUNDS: isTest ? 4 : 10,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // A4: tests get a throwaway in-memory database, the real server gets a file
  // on disk (queuesmart-api/queuesmart.db) so that data survives a restart.
  DB_FILE: process.env.DB_FILE || (isTest ? ':memory:' : path.join(__dirname, '..', 'queuesmart.db')),
};