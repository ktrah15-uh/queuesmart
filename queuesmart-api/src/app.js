/**
 * QueueSmart - Express application. Owner: Killian.
 * Exports the app WITHOUT calling listen() so tests can drive it directly.
 */

const express = require('express');
const cors = require('cors');

const { CORS_ORIGIN } = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const serviceRoutes = require('./modules/services/services.routes');
const queueRoutes = require('./modules/queue/queue.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const historyRoutes = require('./modules/history/history.routes');
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'queuesmart-api' })
);

app.use('/api/services', serviceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;