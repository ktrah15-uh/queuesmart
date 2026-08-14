const { db } = require('../src/data/db');
const smart = require('../src/modules/smart/smart.service');

const avgWaitFor = db.prepare(
  `SELECT ROUND(AVG((julianday(endedAt) - julianday(joinedAt)) * 1440), 1) AS avgWait,
          COUNT(*) AS visits
     FROM History
    WHERE serviceId = ? AND outcome = 'served' AND endedAt IS NOT NULL`
);

const rows = db
  .prepare('SELECT id, name, expectedDuration FROM Service ORDER BY id')
  .all()
  .map((service) => {
    const { avgWait, visits } = avgWaitFor.get(service.id);
    const rate = smart.learnServiceMinutes(service.id);
    const best = smart.bestTimeToJoin(service.id);

    return {
      Service: service.name,
      Expected: `${service.expectedDuration} min`,
      'Actual avg wait': avgWait == null ? 'n/a' : `${avgWait} min`,
      Learned: `${rate.rate} min`,
      Basis: rate.source,
      Samples: rate.samples || 0,
      Visits: visits,
      Quietest: best.quietest ? smart.formatHour(best.quietest.hour) : 'n/a',
      Busiest: best.busiest ? smart.formatHour(best.busiest.hour) : 'n/a',
    };
  });

console.table(rows);

const waiting = db
  .prepare(`SELECT COUNT(*) AS c FROM QueueEntry WHERE status = 'waiting'`)
  .get().c;
const history = db.prepare('SELECT COUNT(*) AS c FROM History').get().c;

console.log(`\n${history} history rows, ${waiting} people currently waiting.`);