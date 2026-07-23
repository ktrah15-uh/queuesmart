/**
 * QueueSmart - History. OWNER: DAVID.
 * Mounted at /api/history. Replace the 501 below with real routes.
 *
 * Records a row in store.history when a queue entry ends (served / left /
 * no-show) so the A2 History screen and the admin usage stats have data.
 *
 * Reuse:
 *   const { validateBody, ApiError } = require('../../utils/validate');
 *   const { requireAuth, requireRole } = require('../../middleware/auth');
 *   const { store, nextId } = require('../../data/store');  // store.history
 *
 * requireRole('admin') on the stats endpoint - students shouldn't see it.
 */

const express = require('express');
const { ApiError } = require('../../utils/validate');

const router = express.Router();

router.use((req, res, next) =>
  next(new ApiError(501, 'NOT_IMPLEMENTED', 'History module not implemented yet (owner: David)')));

module.exports = router;