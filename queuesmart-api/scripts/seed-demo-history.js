/**
 * QueueSmart - demo history seeder (A5).
 *
 * Generates ~3 weeks of realistic queue participation so the reporting module
 * and the smart engine have something to work with in the demo:
 *   - weekdays only
 *   - a lunchtime rush (11am-1pm), quiet early and late
 *   - real service rates that differ from the admin's expectedDuration,
 *     which is what the smart engine discovers
 *   - a realistic mix of served / left / no-show
 *
 * Run:  npm run seed        (users + services first)
 *       npm run seed:demo   (this file)
 */

const { db } = require('../src/data/db');

const DAYS_BACK = 21;

// Real minutes-per-person, deliberately different from expectedDuration.
const REAL_RATE = [
  { match: 'financial', minutes: 14 },
  { match: 'it help', minutes: 4 },
  { match: 'academic', minutes: 11 },
  { match: 'registrar', minutes: 7 },
];

// Relative demand by hour, 8am-4pm. Lunch is the rush.
const HOUR_WEIGHT = { 8: 1, 9: 2, 10: 3, 11: 6, 12: 7, 13: 5, 14: 3, 15: 2, 16: 2 };

const fmt = (d) => d.toISOString().replace('T', ' ').slice(0, 19);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function realRateFor(name) {
  const hit = REAL_RATE.find((r) => name.toLowerCase().includes(r.match));
  return hit ? hit.minutes : 10;
}

function main() {
  const users = db.prepare(`SELECT id FROM UserCredentials WHERE role = 'user'`).all();
  const services = db.prepare(`SELECT id, name, expectedDuration FROM Service`).all();

  if (users.length === 0 || services.length === 0) {
    console.error('No users or services found. Run `npm run seed` first.');
    process.exit(1);
  }

  console.log(`${users.length} users, ${services.length} services, ` +
    `${db.prepare('SELECT COUNT(*) AS c FROM History').get().c} existing history rows.`);

  const insertHistory = db.prepare(`
    INSERT INTO History (userId, serviceId, serviceName, joinedAt, endedAt, outcome)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertNotification = db.prepare(`
    INSERT INTO Notification (userId, type, message, status) VALUES (?, ?, ?, 'viewed')
  `);

  let created = 0;

  const run = db.transaction(() => {
    for (let d = DAYS_BACK; d >= 1; d -= 1) {
      const day = new Date(Date.now() - d * 86400000);
      const weekday = day.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;

      for (const service of services) {
        const rate = realRateFor(service.name);

        for (const [hourStr, weight] of Object.entries(HOUR_WEIGHT)) {
          const hour = Number(hourStr);
          const visits = Math.round(weight * (0.6 + Math.random() * 0.8));

          for (let i = 0; i < visits; i += 1) {
            // Completions spaced by the real service rate - this is the
            // signal learnServiceMinutes() picks up.
            const ended = new Date(Date.UTC(
              day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
              hour, Math.min(59, i * rate + Math.floor(Math.random() * 3)), 0
            ));

            // Wait scales with how busy the hour is - the pattern
            // bestTimeToJoin() discovers.
            const waitMinutes = Math.max(2, Math.round(weight * rate * (0.5 + Math.random() * 0.6)));
            const joined = new Date(ended.getTime() - waitMinutes * 60000);

            const roll = Math.random();
            const outcome = roll < 0.85 ? 'served' : roll < 0.94 ? 'left' : 'no-show';
            const user = pick(users);

            insertHistory.run(
              user.id, service.id, service.name,
              fmt(joined), fmt(ended), outcome
            );
            created += 1;

            if (Math.random() < 0.25) {
              insertNotification.run(user.id, 'queue', `You are next in line for ${service.name}.`);
            }
          }
        }
      }
    }
  });

  run();
  console.log(`Inserted ${created} history rows across ${DAYS_BACK} days.`);
}

main();