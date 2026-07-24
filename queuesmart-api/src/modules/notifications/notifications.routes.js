/**
 * QueueSmart - Notification routes. David.
 * Mounted at /api/notifications
 */

const express = require('express');
const { validateBody } = require('../../utils/validate');
const { requireAuth } = require('../../middleware/auth');
const notificationsService = require('./notifications.service');

const router = express.Router();

const createSchema = {
  type: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  message: { type: 'string', required: true, minLength: 1, maxLength: 500 },
};

router.get('/', requireAuth, (req, res, next) => {
  try {
    res.json(notificationsService.listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(createSchema), (req, res, next) => {
  try {
    const note = notificationsService.notify(req.user.id, req.data.type, req.data.message);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', requireAuth, (req, res, next) => {
  try {
    const updated = notificationsService.markAllRead(req.user.id);
    res.json({ updated: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/', requireAuth, (req, res, next) => {
  try {
    const removed = notificationsService.clearAll(req.user.id);
    res.json({ removed: removed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
