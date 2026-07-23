/**
 * QueueSmart - Queue Management + wait-time estimation. OWNER: ALAN.
 * Mounted at /api/queue. Replace the 501 below with real routes.
 *
 * You also own the shared queue structure. Please export the functions Andres
 * calls (at least getQueueForService(serviceId) and serveNext(serviceId)) from a
 * queue.service.js in this folder, and put their signatures in API_CONTRACT.md.
 *
 * Reuse:
 *   const { validateBody, ApiError } = require('../../utils/validate');
 *   const { requireAuth } = require('../../middleware/auth');
 *   const { store, nextId } = require('../../data/store');  // store.queueEntries
 *
 * Use req.user.id as the acting user - never a userId from the body.
 * A3 wait-time stays simple: peopleAhead * service.expectedDuration.
 */

const express = require('express');
const { ApiError } = require('../../utils/validate');

const router = express.Router();

router.use((req, res, next) =>
        next(new ApiError(501, 'NOT_IMPLEMENTED', 'Queue module not implemented yet (owner: Alan)')));

module.exports = router;