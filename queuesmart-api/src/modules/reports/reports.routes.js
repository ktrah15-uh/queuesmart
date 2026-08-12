/**
 * QueueSmart - Reporting routes (A5). Administrator only.
 *
 * GET /api/reports/summary?from&to&serviceId
 * GET /api/reports/:type?from&to&serviceId                        -> JSON
 * GET /api/reports/:type/export?format=csv|pdf&from&to&serviceId  -> file
 *   :type = users | services | participation
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { ValidationError, ApiError } = require('../../utils/validate');
const reports = require('./reports.service');

const router = express.Router();

// One guard for the whole module - there is no non-admin reporting endpoint.
router.use(requireAuth, requireRole('admin'));

/**
 * Validates the query string. Returns null and forwards a ValidationError when
 * the filters are bad, so callers just `if (!filters) return;`.
 *
 * Filters arrive on req.query, so validateBody(schema) does not apply here.
 */
function parseFilters(req, next) {
  const { errors, filters } = reports.normalizeFilters(req.query);
  if (errors.length) {
    const fields = {};
    for (const { field, message } of errors) fields[field] = message;
    next(new ValidationError(fields));
    return null;
  }
  return filters;
}

function assertType(type) {
  if (!reports.REPORT_TYPES.includes(type)) {
    throw new ApiError(
      404,
      'REPORT_NOT_FOUND',
      `Unknown report type '${type}'. Expected one of: ${reports.REPORT_TYPES.join(', ')}`
    );
  }
}

/** Headline numbers, used by the Reports screen and the admin dashboard. */
router.get('/summary', (req, res, next) => {
  try {
    const filters = parseFilters(req, next);
    if (!filters) return;
    res.json({ filters, summary: reports.getSummary(filters) });
  } catch (err) {
    next(err);
  }
});

/** Must be declared before '/:type' so it is not swallowed by it. */
router.get('/:type/export', (req, res, next) => {
  try {
    const { type } = req.params;
    assertType(type);

    const format = String(req.query.format || 'csv').toLowerCase();
    if (!['csv', 'pdf'].includes(format)) {
      return next(new ValidationError({ format: "format must be 'csv' or 'pdf'" }));
    }

    const filters = parseFilters(req, next);
    if (!filters) return;

    const rows = reports.getReport(type, filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${reports.filename(type, 'csv')}"`);
      return res.send(reports.toCsv(type, rows));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reports.filename(type, 'pdf')}"`);
    // Streams straight to the response - do not send anything else after this.
    reports.writePdf(type, rows, filters, reports.getSummary(filters), res);
  } catch (err) {
    next(err);
  }
});

/** The report itself, as JSON, for the on-screen table. */
router.get('/:type', (req, res, next) => {
  try {
    const { type } = req.params;
    assertType(type);

    const filters = parseFilters(req, next);
    if (!filters) return;

    const rows = reports.getReport(type, filters);
    res.json({
      type,
      filters,
      summary: reports.getSummary(filters),
      count: rows.length,
      rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;