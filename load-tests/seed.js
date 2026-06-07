/**
 * Load Test Seed Script
 * Creates test users, courses, and lessons needed by k6 load tests.
 * Run ONCE before load testing against a fresh environment.
 *
 * Usage: node load-tests/seed.js --api http://localhost:4000/api/v1 --users 200
 */
const https = require('https');
const http  = require('http');

const args = process.argv.slice(2);
const API  = args[args.indexOf('--api')  + 1] || 'http://localhost:4000/api/v1';
const COUNT = parseInt(args[args.indexOf('--users') + 1] || '200', 10);

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(path, API + '/');
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers:  { 'Content-Type': 'application/json' },
    };
    const payload = body ? JSON.stringify(body) : undefined;
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function seed() {
  console.log(`\n🌱 Seeding ${COUNT} load test users at ${API}...\n`);

  let created = 0, skipped = 0, failed = 0;

  for (let i = 0; i < COUNT; i++) {
    const user = {
      email:     `loadtest_user_${i}@test.com`,
      firstName: 'Load',
      lastName:  `User${i}`,
      password:  'LoadTest@1234',
    };

    const res = await request('POST', '/auth/register', user);

    if (res.status === 201 || res.status === 200) {
      created++;
      if (i % 50 === 0) process.stdout.write(`  Created ${created} users...\r`);
    } else if (res.status === 409) {
      skipped++; // Already exists
    } else {
      failed++;
      if (failed < 5) console.error(`  ✗ Failed user ${i}: ${res.status} — ${JSON.stringify(res.body)}`);
    }

    // Rate limit: 50 registrations/sec
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 20));
  }

  console.log(`\n✓ Seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Failed:  ${failed}`);
  console.log('');

  if (failed > COUNT * 0.05) {
    console.error('⚠ More than 5% of users failed to create — check API health');
    process.exit(1);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
