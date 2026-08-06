/**
 * QueueSmart - seeds two demo accounts so the UI has something to log in with.
 * Run with:  npm run seed
 * Safe to run twice: existing accounts are skipped.
 */

const authService = require('../src/modules/auth/auth.service');
const { DB_FILE } = require('../src/config');

const DEMO_ACCOUNTS = [
  { name: 'Admin User', email: 'admin@queuesmart.test', password: 'admin12345', role: 'admin' },
  { name: 'Demo Student', email: 'student@queuesmart.test', password: 'student12345', role: 'user' },
];

console.log(`Seeding ${DB_FILE}`);

for (const account of DEMO_ACCOUNTS) {
  if (authService.findByEmail(account.email)) {
    console.log(`  skipped ${account.email} (already exists)`);
    continue;
  }
  authService.register(account);
  console.log(`  created ${account.email} / ${account.password} (${account.role})`);
}

console.log('Done.');