/**
 * QueueSmart - Notifications. OWNER: DAVID.
 * Mounted at /api/notifications. Replace the 501 below with real routes.
 *
 * A3 requires no real email/SMS - push objects into store.notifications and
 * return them to the front end. Please export something like
 * notify(userId, type, message) so Alan can call it when a user joins a queue
 * or is close to being served, and note it in API_CONTRACT.md.
 *
 * Reuse:
 *   const { validateBody, ApiError } = require('../../utils/validate');
 *   const { requireAuth } = require('../../middleware/auth');
 *   const { store, nextId } = require('../../data/store');  // store.notifications
 */

const express = require('express');
const { ApiError } = require('../../utils/validate');

const router = express.Router();

router.use((req, res, next) =>
  next(new ApiError(501, 'NOT_IMPLEMENTED', 'Notification module not implemented yet (owner: David)')));

module.exports = router;