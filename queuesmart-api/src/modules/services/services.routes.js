/**
 * QueueSmart - Service Management routes. Owner: Andres.
 * Mounted at /api/services
 */

const express = require('express');
const { validateBody, ApiError } = require('../../utils/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const servicesService = require('./services.service');

const router = express.Router();

const createServiceSchema = {
  name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  description: { type: 'string', required: true, maxLength: 500 },
  expectedDuration: { type: 'integer', required: true, min: 1, max: 480 },
  priority: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' },
};

const updateServiceSchema = {
  name: { type: 'string', minLength: 2, maxLength: 100 },
  description: { type: 'string', maxLength: 500 },
  expectedDuration: { type: 'integer', min: 1, max: 480 },
  priority: { type: 'enum', values: ['low', 'medium', 'high'] },
  isOpen: { type: 'boolean' },
};

function parseId(req, next) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    next(new ApiError(400, 'VALIDATION_ERROR', 'Service id must be a number'));
    return null;
  }
  return id;
}

// GET /api/services - any signed-in user (needed to browse/join services)
router.get('/', requireAuth, (req, res) => {
  res.json(servicesService.listServices());
});

// GET /api/services/:id
router.get('/:id', requireAuth, (req, res, next) => {
  const id = parseId(req, next);
  if (id === null) return;
  try {
    res.json(servicesService.getServiceById(id));
  } catch (err) {
    next(err);
  }
});

// POST /api/services - admin only
router.post('/', requireAuth, requireRole('admin'), validateBody(createServiceSchema), (req, res, next) => {
  try {
    res.status(201).json(servicesService.createService(req.data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id - admin only, partial update (also used to open/close a service)
router.put('/:id', requireAuth, requireRole('admin'), validateBody(updateServiceSchema), (req, res, next) => {
  const id = parseId(req, next);
  if (id === null) return;
  try {
    res.json(servicesService.updateService(id, req.data));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id - admin only
router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  const id = parseId(req, next);
  if (id === null) return;
  try {
    res.json(servicesService.deleteService(id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
