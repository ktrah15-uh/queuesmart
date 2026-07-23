/**
 * QueueSmart - Authentication + role middleware. Owner: Killian.
 *
 * Alan / Andres / David - this is the part of my slice you call:
 *
 *   const { requireAuth, requireRole } = require('../../middleware/auth');
 *
 *   router.post('/join',  requireAuth, handler);                       // any user
 *   router.post('/serve', requireAuth, requireRole('admin'), handler); // admin only
 *
 * After requireAuth runs, req.user is { id, email, role }.
 */

const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/validate');
const { JWT_SECRET } = require('../config');

function signToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

/** requireRole('admin') or requireRole('admin', 'user') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', `Requires role: ${roles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { signToken, requireAuth, requireRole };