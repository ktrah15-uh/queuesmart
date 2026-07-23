/**
 * QueueSmart - Service Management. OWNER: ANDRES.
 * Mounted at /api/services. Replace the 501 below.
 *
 * Suggested schema:
 *   const createServiceSchema = {
 *     name:             { type: 'string',  required: true, maxLength: 100 },
 *     description:      { type: 'string',  required: true, maxLength: 500 },
 *     expectedDuration: { type: 'integer', required: true, min: 1, max: 480 },
 *     priority:         { type: 'enum', values: ['low','medium','high'], default: 'medium' },
 *   };
 *
 * Reuse: validateBody, ApiError, requireAuth, requireRole('admin'), store.services
 */

const express = require('express');
const { ApiError } = require('../../utils/validate');

const router = express.Router();

router.use((req, res, next) =>
  next(new ApiError(501, 'NOT_IMPLEMENTED', 'Service management module not implemented yet (owner: Andres)')));

module.exports = router;