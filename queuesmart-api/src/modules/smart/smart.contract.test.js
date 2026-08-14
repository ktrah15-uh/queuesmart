/**
 * Contract tests for the smart module.
 *
 * These cover the response shape <SmartInsight /> consumes, plus the four
 * integration bugs found when Alan's module was merged with David's panel:
 *   - getInsight returned rate/estimateWait/bestTimes, the panel reads
 *     estimate/alternative/bestTime, so the panel silently rendered nothing
 *   - the gap average was a mean, so idle time between rushes inflated it
 *   - quietest/busiest compared against a key that was never stored
 *   - position N was charged N slots instead of N-1
 */
 
const { db } = require('../../data/db');
const smart = require('./smart.service');
 
let userId;
let itDesk;
let advising;
let itQueue;
 
beforeEach(() => {
  db.prepare('DELETE FROM History').run();
  db.prepare('DELETE FROM QueueEntry').run();
  db.prepare('DELETE FROM Queue').run();
  db.prepare('DELETE FROM Service').run();
  db.prepare('DELETE FROM UserCredentials').run();
 
  userId = db
    .prepare(`INSERT INTO UserCredentials (email, passwordHash, role)
              VALUES ('contract@uh.edu', 'hash', 'user')`)
    .run().lastInsertRowid;
 
  itDesk = db
    .prepare(`INSERT INTO Service (name, description, expectedDuration, priority)
              VALUES ('IT Help Desk', 'wifi and laptops', 30, 'medium')`)
    .run().lastInsertRowid;
  itQueue = db
    .prepare(`INSERT INTO Queue (serviceId, status) VALUES (?, 'open')`)
    .run(itDesk).lastInsertRowid;
 
  advising = db
    .prepare(`INSERT INTO Service (name, description, expectedDuration, priority)
              VALUES ('Academic Advising', 'degree plans', 20, 'high')`)
    .run().lastInsertRowid;
  db.prepare(`INSERT INTO Queue (serviceId, status) VALUES (?, 'open')`).run(advising);
});
 
const addHistory = db.prepare(
  `INSERT INTO History (userId, serviceId, serviceName, joinedAt, endedAt, outcome)
   VALUES (?, ?, 'S', ?, ?, 'served')`
);
 
/** Completions `everyMinutes` apart from 10:00 on 2026-08-13. */
function completions(serviceId, count, everyMinutes) {
  for (let i = 0; i < count; i += 1) {
    const minute = i * everyMinutes;
    const hh = String(10 + Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    const stamp = `2026-08-13 ${hh}:${mm}:00`;
    addHistory.run(userId, serviceId, stamp, stamp);
  }
}
 
function addWaiting(queueId, position) {
  db.prepare(
    `INSERT INTO QueueEntry (queueId, userId, position, joinTime, status)
     VALUES (?, ?, ?, '2026-08-13 10:00:00', 'waiting')`
  ).run(queueId, userId, position);
}
 
/* ---------- the shape the front end depends on ---------- */
 
describe('getInsight response contract', () => {
  test('returns estimate, alternative and bestTime at the top level', () => {
    const insight = smart.getInsight(itDesk, 3);
 
    expect(insight).toHaveProperty('serviceId', itDesk);
    expect(insight).toHaveProperty('serviceName', 'IT Help Desk');
    expect(insight).toHaveProperty('estimate');
    expect(insight).toHaveProperty('alternative');
    expect(insight).toHaveProperty('bestTime');
  });
 
  test('estimate carries every field the panel reads', () => {
    const { estimate } = smart.getInsight(itDesk, 3);
 
    expect(estimate).toHaveProperty('estimatedMinutes');
    expect(estimate).toHaveProperty('peopleAhead');
    expect(estimate).toHaveProperty('minutesPerPerson');
    expect(estimate).toHaveProperty('basis');
    expect(estimate).toHaveProperty('explanation');
  });
 
  test('bestTime carries byHour, quietest, busiest and note', () => {
    const { bestTime } = smart.getInsight(itDesk);
 
    expect(Array.isArray(bestTime.byHour)).toBe(true);
    expect(bestTime).toHaveProperty('quietest');
    expect(bestTime).toHaveProperty('busiest');
    expect(bestTime).toHaveProperty('note');
  });
 
  test('quietest is an hour number, not an object', () => {
    for (let i = 0; i < 4; i += 1) {
      addHistory.run(userId, itDesk, `2026-08-1${i} 09:00:00`, `2026-08-1${i} 09:10:00`);
      addHistory.run(userId, itDesk, `2026-08-1${i} 14:00:00`, `2026-08-1${i} 14:50:00`);
    }
    const { bestTime } = smart.getInsight(itDesk);
 
    expect(typeof bestTime.quietest).toBe('number');
    expect(bestTime.quietest).toBe(9);
    expect(bestTime.busiest).toBe(14);
  });
});
 
/* ---------- the bugs ---------- */
 
describe('position handling', () => {
  test('position 1 means nobody is ahead of you', () => {
    completions(itDesk, 10, 4);
    const { estimate } = smart.getInsight(itDesk, 1);
 
    expect(estimate.peopleAhead).toBe(0);
    expect(estimate.estimatedMinutes).toBe(0);
    expect(estimate.explanation).toMatch(/Nobody ahead of you/);
  });
 
  test('position 5 means four people ahead', () => {
    completions(itDesk, 10, 4);
    const { estimate } = smart.getInsight(itDesk, 5);
 
    expect(estimate.peopleAhead).toBe(4);
    expect(estimate.minutesPerPerson).toBe(4);
    expect(estimate.estimatedMinutes).toBe(16);
  });
 
  test('with no position it counts everyone currently waiting', () => {
    addWaiting(itQueue, 1);
    addWaiting(itQueue, 2);
    completions(itDesk, 10, 4);
 
    expect(smart.getInsight(itDesk).estimate.peopleAhead).toBe(2);
  });
});
 
describe('learned rate', () => {
  test('an idle stretch does not drag the rate upward', () => {
    // fifteen visits four minutes apart, then one long gap under the 120 cap
    completions(itDesk, 15, 4);
    addHistory.run(userId, itDesk, '2026-08-13 12:30:00', '2026-08-13 12:30:00');
 
    const rate = smart.learnServiceMinutes(itDesk);
    expect(rate.source).toBe('history');
    expect(rate.rate).toBe(4); // a mean would land near 8
  });
 
  test('the explanation says the number was learned, not scheduled', () => {
    completions(itDesk, 10, 4);
    expect(smart.getInsight(itDesk, 3).estimate.explanation).toMatch(/every 4 minutes/);
  });
 
  test('the explanation admits when it is only the scheduled duration', () => {
    const insight = smart.getInsight(advising, 3);
    expect(insight.estimate.basis).toBe('expectedDuration');
    expect(insight.estimate.explanation).toMatch(/scheduled to take/);
  });
});
 
describe('alternative suggestion', () => {
  test('is flattened to serviceId, serviceName and savingMinutes', () => {
    completions(itDesk, 10, 20);   // slow desk
    completions(advising, 10, 2);  // fast desk
    addWaiting(itQueue, 1);
    addWaiting(itQueue, 2);
    addWaiting(itQueue, 3);
 
    const { alternative } = smart.getInsight(itDesk);
 
    expect(alternative).not.toBeNull();
    expect(alternative.serviceName).toBe('Academic Advising');
    expect(alternative).toHaveProperty('serviceId');
    expect(alternative).toHaveProperty('estimatedMinutes');
    expect(alternative.savingMinutes).toBeGreaterThanOrEqual(10);
  });
 
  test('is null when nothing is meaningfully faster', () => {
    expect(smart.getInsight(itDesk, 2).alternative).toBeNull();
  });
});
 
describe('formatHour', () => {
  test('labels midnight, noon, morning and afternoon', () => {
    expect(smart.formatHour(0)).toBe('midnight');
    expect(smart.formatHour(12)).toBe('noon');
    expect(smart.formatHour(9)).toBe('9am');
    expect(smart.formatHour(15)).toBe('3pm');
  });
});
 
describe('note', () => {
  test('is null until at least two hours have enough visits', () => {
    completions(itDesk, 3, 5);
    expect(smart.getInsight(itDesk).bestTime.note).toBeNull();
  });
 
  test('names both hours once there is enough data', () => {
    for (let i = 0; i < 4; i += 1) {
      addHistory.run(userId, itDesk, `2026-08-1${i} 09:00:00`, `2026-08-1${i} 09:10:00`);
      addHistory.run(userId, itDesk, `2026-08-1${i} 12:00:00`, `2026-08-1${i} 12:50:00`);
    }
    const { note } = smart.getInsight(itDesk).bestTime;
 
    expect(note).toContain('9am');
    expect(note).toContain('noon');
  });
});