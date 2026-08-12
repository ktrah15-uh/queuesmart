/**
 * Adds the extra services and users the demo needs, so reports have more than
 * one row and the smart engine has alternatives to compare. Idempotent.
 */

const bcrypt = require('bcryptjs');
const { db } = require('../src/data/db');

const SERVICES = [
  { name: 'IT Help Desk',        description: 'Password resets, laptop and network issues', expectedDuration: 15, priority: 'medium' },
  { name: 'Academic Advising',   description: 'Degree planning and course registration',    expectedDuration: 20, priority: 'high' },
  { name: 'Registrar Office',    description: 'Transcripts, enrollment verification',       expectedDuration: 10, priority: 'low' },
];

const USERS = [
  ['alice@queuesmart.test',   'Alice Johnson'],
  ['bob@queuesmart.test',     'Bob Smith'],
  ['charlie@queuesmart.test', 'Charlie Davis'],
  ['dana@queuesmart.test',    'Dana Lopez'],
  ['evan@queuesmart.test',    'Evan Wright'],
];

const findService = db.prepare(`SELECT id FROM Service WHERE name = ?`);
const insertService = db.prepare(`
  INSERT INTO Service (name, description, expectedDuration, priority) VALUES (?, ?, ?, ?)
`);
const findQueue = db.prepare(`SELECT id FROM Queue WHERE serviceId = ?`);
const insertQueue = db.prepare(`INSERT INTO Queue (serviceId, status) VALUES (?, 'open')`);
const findUser = db.prepare(`SELECT id FROM UserCredentials WHERE email = ?`);
const insertUser = db.prepare(`
  INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, 'user')
`);
const insertProfile = db.prepare(`
  INSERT INTO UserProfile (userId, fullName, email) VALUES (?, ?, ?)
`);

const run = db.transaction(() => {
  for (const s of SERVICES) {
    let row = findService.get(s.name);
    if (!row) {
      const id = insertService.run(s.name, s.description, s.expectedDuration, s.priority).lastInsertRowid;
      row = { id };
      console.log(`  added service ${s.name}`);
    }
    // Every service needs an open queue or it cannot be joined.
    if (!findQueue.get(row.id)) insertQueue.run(row.id);
  }

  const hash = bcrypt.hashSync('Password123!', 10);
  for (const [email, fullName] of USERS) {
    if (findUser.get(email)) continue;
    const id = insertUser.run(email, hash).lastInsertRowid;
    insertProfile.run(id, fullName, email);
    console.log(`  added user ${email}`);
  }

  // Make sure the service that already existed has an open queue too.
  for (const { id } of db.prepare(`SELECT id FROM Service`).all()) {
    if (!findQueue.get(id)) insertQueue.run(id);
  }
});

run();
console.log(`Now: ${db.prepare(`SELECT COUNT(*) AS c FROM Service`).get().c} services, ` +
  `${db.prepare(`SELECT COUNT(*) AS c FROM UserCredentials WHERE role='user'`).get().c} users.`);