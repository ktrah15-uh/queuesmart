/**
 * QueueSmart - Reporting module (A5). Owner: Killian.
 *
 * Aggregates History, QueueEntry, Service and user tables into three admin
 * reports, and exports any of them as CSV or PDF.
 */

const { db } = require('../../data/db');

const REPORT_TYPES = ['users', 'services', 'participation'];

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

/**
 * Normalises query-string filters. Returns { errors, filters } where errors is
 * an array of { field, message } - the routes turn that into a ValidationError.
 */
function normalizeFilters(query = {}) {
  const errors = [];
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  const from = query.from ? String(query.from).trim() : null;
  const to = query.to ? String(query.to).trim() : null;
  const serviceId =
    query.serviceId != null && query.serviceId !== '' ? Number(query.serviceId) : null;

  if (from && !isDate(from)) errors.push({ field: 'from', message: 'from must be YYYY-MM-DD' });
  if (to && !isDate(to)) errors.push({ field: 'to', message: 'to must be YYYY-MM-DD' });
  if (serviceId != null && (!Number.isInteger(serviceId) || serviceId <= 0)) {
    errors.push({ field: 'serviceId', message: 'serviceId must be a positive whole number' });
  }
  if (from && to && isDate(from) && isDate(to) && from > to) {
    errors.push({ field: 'to', message: 'to must not be earlier than from' });
  }

  return {
    errors,
    filters: {
      from: errors.length ? null : from,
      to: errors.length ? null : to,
      serviceId: errors.length ? null : serviceId,
    },
  };
}

/** Shared WHERE fragment + bound params for the History-based reports. */
function historyClause(filters, alias = 'h') {
  const parts = [];
  const params = [];
  if (filters.from) {
    parts.push(`${alias}.joinedAt >= ?`);
    params.push(`${filters.from} 00:00:00`);
  }
  if (filters.to) {
    // end of day, so a single-day range returns that day's rows
    parts.push(`${alias}.joinedAt <= ?`);
    params.push(`${filters.to} 23:59:59`);
  }
  if (filters.serviceId) {
    parts.push(`${alias}.serviceId = ?`);
    params.push(filters.serviceId);
  }
  return { sql: parts.length ? parts.join(' AND ') : '1=1', params };
}

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/* ------------------------------------------------------------------ */
/* Report queries                                                      */
/* ------------------------------------------------------------------ */

/** Headline numbers for the top of any report. */
function getSummary(filters) {
  const w = historyClause(filters);
  const row = db.prepare(`
    SELECT
      COUNT(*)                                                AS totalEntries,
      SUM(CASE WHEN h.outcome = 'served'  THEN 1 ELSE 0 END)  AS served,
      SUM(CASE WHEN h.outcome = 'left'    THEN 1 ELSE 0 END)  AS abandoned,
      SUM(CASE WHEN h.outcome = 'no-show' THEN 1 ELSE 0 END)  AS noShow,
      COUNT(DISTINCT h.userId)                                AS uniqueUsers,
      AVG(CASE WHEN h.outcome = 'served' AND h.endedAt IS NOT NULL
               THEN (julianday(h.endedAt) - julianday(h.joinedAt)) * 1440 END) AS avgWaitMinutes
    FROM History h
    WHERE ${w.sql}
  `).get(...w.params);

  const waiting = db.prepare(
    `SELECT COUNT(*) AS c FROM QueueEntry WHERE status = 'waiting'`
  ).get().c;

  return {
    totalEntries: row.totalEntries || 0,
    served: row.served || 0,
    left: row.abandoned || 0,
    noShow: row.noShow || 0,
    uniqueUsers: row.uniqueUsers || 0,
    avgWaitMinutes: round1(row.avgWaitMinutes),
    currentlyWaiting: waiting,
  };
}

/** One row per registered user: how much they used the system. */
function getUsersReport(filters) {
  const w = historyClause(filters);
  const rows = db.prepare(`
    SELECT
      u.id                                                    AS userId,
      COALESCE(p.fullName, '(no profile)')                    AS fullName,
      u.email                                                 AS email,
      u.role                                                  AS role,
      COUNT(h.id)                                             AS timesJoined,
      SUM(CASE WHEN h.outcome = 'served'  THEN 1 ELSE 0 END)  AS served,
      SUM(CASE WHEN h.outcome = 'left'    THEN 1 ELSE 0 END)  AS abandoned,
      SUM(CASE WHEN h.outcome = 'no-show' THEN 1 ELSE 0 END)  AS noShow,
      AVG(CASE WHEN h.outcome = 'served' AND h.endedAt IS NOT NULL
               THEN (julianday(h.endedAt) - julianday(h.joinedAt)) * 1440 END) AS avgWaitMinutes,
      MAX(h.joinedAt)                                         AS lastActivity
    FROM UserCredentials u
    LEFT JOIN UserProfile p ON p.userId = u.id
    LEFT JOIN History h     ON h.userId = u.id AND ${w.sql}
    GROUP BY u.id
    ORDER BY timesJoined DESC, u.email ASC
  `).all(...w.params);

  return rows.map((r) => ({ ...r, avgWaitMinutes: round1(r.avgWaitMinutes) }));
}

/** One row per service: demand, outcomes and current queue state. */
function getServicesReport(filters) {
  const w = historyClause(filters);
  const rows = db.prepare(`
    SELECT
      s.id                                                    AS serviceId,
      s.name                                                  AS serviceName,
      s.priority                                              AS priority,
      s.expectedDuration                                      AS expectedDuration,
      COUNT(h.id)                                             AS totalEntries,
      SUM(CASE WHEN h.outcome = 'served'  THEN 1 ELSE 0 END)  AS served,
      SUM(CASE WHEN h.outcome = 'left'    THEN 1 ELSE 0 END)  AS abandoned,
      SUM(CASE WHEN h.outcome = 'no-show' THEN 1 ELSE 0 END)  AS noShow,
      AVG(CASE WHEN h.outcome = 'served' AND h.endedAt IS NOT NULL
               THEN (julianday(h.endedAt) - julianday(h.joinedAt)) * 1440 END) AS avgWaitMinutes,
      (SELECT COUNT(*) FROM QueueEntry qe
         JOIN Queue q ON q.id = qe.queueId
        WHERE q.serviceId = s.id AND qe.status = 'waiting') AS currentlyWaiting,
      (SELECT q2.status FROM Queue q2
        WHERE q2.serviceId = s.id ORDER BY q2.id DESC LIMIT 1) AS queueStatus
    FROM Service s
    LEFT JOIN History h ON h.serviceId = s.id AND ${w.sql}
    GROUP BY s.id
    ORDER BY totalEntries DESC, s.name ASC
  `).all(...w.params);

  return rows.map((r) => ({ ...r, avgWaitMinutes: round1(r.avgWaitMinutes) }));
}

/** One row per visit - the raw activity log. */
function getParticipationReport(filters) {
  const w = historyClause(filters);
  const rows = db.prepare(`
    SELECT
      h.id                                 AS historyId,
      COALESCE(p.fullName, '(no profile)') AS fullName,
      u.email                              AS email,
      h.serviceName                        AS serviceName,
      h.joinedAt                           AS joinedAt,
      h.endedAt                            AS endedAt,
      h.outcome                            AS outcome,
      CASE WHEN h.endedAt IS NOT NULL
           THEN (julianday(h.endedAt) - julianday(h.joinedAt)) * 1440 END AS waitMinutes
    FROM History h
    JOIN UserCredentials u  ON u.id = h.userId
    LEFT JOIN UserProfile p ON p.userId = h.userId
    WHERE ${w.sql}
    ORDER BY h.joinedAt DESC
  `).all(...w.params);

  return rows.map((r) => ({ ...r, waitMinutes: round1(r.waitMinutes) }));
}

/** Column definitions drive the CSV header and the PDF table together. */
const COLUMNS = {
  users: [
    { key: 'userId', label: 'User ID', width: 45 },
    { key: 'fullName', label: 'Name', width: 110 },
    { key: 'email', label: 'Email', width: 140 },
    { key: 'role', label: 'Role', width: 45 },
    { key: 'timesJoined', label: 'Joined', width: 45 },
    { key: 'served', label: 'Served', width: 45 },
    { key: 'abandoned', label: 'Left', width: 35 },
    { key: 'noShow', label: 'No-show', width: 50 },
    { key: 'avgWaitMinutes', label: 'Avg wait (min)', width: 75 },
  ],
  services: [
    { key: 'serviceId', label: 'ID', width: 30 },
    { key: 'serviceName', label: 'Service', width: 130 },
    { key: 'priority', label: 'Priority', width: 55 },
    { key: 'expectedDuration', label: 'Expected (min)', width: 75 },
    { key: 'totalEntries', label: 'Entries', width: 50 },
    { key: 'served', label: 'Served', width: 45 },
    { key: 'abandoned', label: 'Left', width: 35 },
    { key: 'avgWaitMinutes', label: 'Avg wait (min)', width: 75 },
    { key: 'currentlyWaiting', label: 'Waiting now', width: 65 },
  ],
  participation: [
    { key: 'fullName', label: 'User', width: 105 },
    { key: 'email', label: 'Email', width: 135 },
    { key: 'serviceName', label: 'Service', width: 115 },
    { key: 'joinedAt', label: 'Joined', width: 105 },
    { key: 'endedAt', label: 'Ended', width: 105 },
    { key: 'outcome', label: 'Outcome', width: 55 },
    { key: 'waitMinutes', label: 'Wait (min)', width: 60 },
  ],
};

const TITLES = {
  users: 'User Participation Report',
  services: 'Service & Queue Activity Report',
  participation: 'Queue Participation Log',
};

/** Single entry point used by the routes. */
function getReport(type, filters) {
  if (!REPORT_TYPES.includes(type)) {
    throw new Error(`Unknown report type: ${type}`);
  }
  if (type === 'users') return getUsersReport(filters);
  if (type === 'services') return getServicesReport(filters);
  return getParticipationReport(filters);
}

/* ------------------------------------------------------------------ */
/* Exporters                                                           */
/* ------------------------------------------------------------------ */

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds an RFC-4180 style CSV string. No extra dependency needed. */
function toCsv(type, rows) {
  const cols = COLUMNS[type];
  const lines = [cols.map((c) => csvCell(c.label)).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => csvCell(row[c.key])).join(','));
  }
  return lines.join('\r\n');
}

function describeFilters(filters) {
  return [
    filters.from ? `From ${filters.from}` : 'From: all time',
    filters.to ? `To ${filters.to}` : 'To: today',
    filters.serviceId ? `Service ID ${filters.serviceId}` : 'All services',
  ].join('  |  ');
}

/** Streams a PDF to a writable stream (the Express response). */
function writePdf(type, rows, filters, summary, stream) {
  const PDFDocument = require('pdfkit');
  const cols = COLUMNS[type];
  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 36 });
  doc.pipe(stream);

  doc.fontSize(18).font('Helvetica-Bold').text('QueueSmart');
  doc.fontSize(13).font('Helvetica').text(TITLES[type]);
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#555')
    .text(`Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`)
    .text(describeFilters(filters));

  if (summary) {
    doc.moveDown(0.4).fillColor('#000').fontSize(9).font('Helvetica-Bold').text(
      `Entries: ${summary.totalEntries}   Served: ${summary.served}   Left: ${summary.left}   ` +
      `No-show: ${summary.noShow}   Unique users: ${summary.uniqueUsers}   ` +
      `Avg wait: ${summary.avgWaitMinutes == null ? 'n/a' : summary.avgWaitMinutes + ' min'}`
    );
  }
  doc.moveDown(0.6);

  const startX = doc.page.margins.left;
  const bottom = doc.page.height - doc.page.margins.bottom - 20;

  const drawHeader = () => {
    let x = startX;
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    cols.forEach((c) => {
      doc.text(c.label, x, y, { width: c.width, ellipsis: true });
      x += c.width;
    });
    doc.moveTo(startX, y + 12)
      .lineTo(startX + cols.reduce((s, c) => s + c.width, 0), y + 12)
      .strokeColor('#999').stroke();
    doc.y = y + 16;
  };

  drawHeader();
  doc.font('Helvetica').fontSize(8);

  if (rows.length === 0) {
    doc.fillColor('#666').text('No records match these filters.', startX, doc.y + 4);
  }

  rows.forEach((row) => {
    if (doc.y > bottom) {
      doc.addPage();
      drawHeader();
      doc.font('Helvetica').fontSize(8);
    }
    let x = startX;
    const y = doc.y;
    cols.forEach((c) => {
      const v = row[c.key];
      doc.fillColor('#000').text(v == null ? '-' : String(v), x, y, { width: c.width, ellipsis: true });
      x += c.width;
    });
    doc.y = y + 13;
  });

  doc.end();
  return doc;
}

function filename(type, ext) {
  return `queuesmart-${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

module.exports = {
  REPORT_TYPES,
  COLUMNS,
  TITLES,
  normalizeFilters,
  getSummary,
  getReport,
  getUsersReport,
  getServicesReport,
  getParticipationReport,
  toCsv,
  writePdf,
  filename,
};