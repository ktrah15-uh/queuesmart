/**
 * QueueSmart - Express application. Owner: Killian.
 */
const express = require('express');
const cors = require('cors');
const { CORS_ORIGIN } = require('./config');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'queuesmart-api' })
);

module.exports = app;