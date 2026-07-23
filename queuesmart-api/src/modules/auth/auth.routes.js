/**
 * QueueSmart - Auth routes. Owner: Killian.
 * Mounted at /api/auth
 */

const express = require('express');
const { validateBody, ApiError } = require('../../utils/validate');
const { signToken, requireAuth } = require('../../middleware/auth');
const authService = require('./auth.service');

const router = express.Router();

const registerSchema = {
  name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  email: { type: 'email', required: true, maxLength: 254 },
  password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
  role: { type: 'enum', values: ['user', 'admin'], default: 'user' },
};

const loginSchema = {
  email: { type: 'email', required: true, maxLength: 254 },
  password: { type: 'string', required: true, minLength: 1, maxLength: 128 },
};

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), (req, res, next) => {
  try {
    const user = authService.register(req.data);
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), (req, res, next) => {
  try {
    const user = authService.login(req.data);
    res.status(200).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - the front end calls this on page load to restore a session
router.get('/me', requireAuth, (req, res, next) => {
  const user = authService.findById(req.user.id);
  if (!user) return next(new ApiError(404, 'NOT_FOUND', 'User no longer exists'));
  res.json({ user: authService.toPublicUser(user) });
});

module.exports = router;