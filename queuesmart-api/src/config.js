/**
 * QueueSmart - Configuration. Owner: Killian.
 */
module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'queuesmart-dev-secret-a3',
  BCRYPT_ROUNDS: process.env.NODE_ENV === 'test' ? 4 : 10,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};