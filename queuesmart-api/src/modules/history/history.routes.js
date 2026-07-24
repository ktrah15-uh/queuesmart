/**
 * QueueSmart - History routes. David.
 * Mounted at /api/history
 */

const express = require('express');
const { validateBody } = require('../../utils/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const historyService = require('./history.service');

const router = express.Router();

const recordSchema = {
  serviceId: { type: 'integer', required: false, min: 1 },
  serviceName: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  joinedAt: { type: 'string', required: false, maxLength: 40 },
  outcome: { type: 'enum', required: true, values: ['served', 'left', 'no-show'] },
};

router.get('/', requireAuth, (req, res, next) => {
  try {
    res.json(historyService.listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(historyService.getStats());
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(recordSchema), (req, res, next) => {
  try {
    const entry = historyService.recordHistory({
      userId: req.user.id,
      serviceId: req.data.serviceId,
      serviceName: req.data.serviceName,
      joinedAt: req.data.joinedAt,
      outcome: req.data.outcome,
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
