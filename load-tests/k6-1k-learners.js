/**
 * Load Test: 1,000 Concurrent Learners
 * Simulates a normal busy day: browse → login → dashboard → watch video → submit progress
 *
 * Run: k6 run load-tests/k6-1k-learners.js
 * Install k6: https://k6.io/docs/getting-started/installation/
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const loginSuccess   = new Rate('login_success_rate');
const progressErrors = new Rate('progress_error_rate');
const loginDuration  = new Trend('login_duration_ms', true);
const progressDuration = new Trend('progress_duration_ms', true);
const totalRequests  = new Counter('total_requests');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp up to 1,000 users over 2 minutes, hold for 5 minutes, ramp down
    learner_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },   // Ramp up
        { duration: '2m', target: 600 },   // Accelerate
        { duration: '2m', target: 1000 },  // Peak load
        { duration: '5m', target: 1000 },  // Sustain peak
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // P95 response times
    http_req_duration:         ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms
    login_duration_ms:         ['p(95)<300'],
    progress_duration_ms:      ['p(95)<200'],

    // Error rates
    http_req_failed:           ['rate<0.01'],   // <1% HTTP errors
    login_success_rate:        ['rate>0.99'],   // >99% login success
    progress_error_rate:       ['rate<0.005'],  // <0.5% progress errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

// Test data pools
const TEST_USERS = Array.from({ length: 200 }, (_, i) => ({
  email: `loadtest_user_${i}@test.com`,
  password: 'LoadTest@1234',
}));

const COURSE_IDS  = (__ENV.COURSE_IDS  || 'course-1,course-2,course-3').split(',');
const LESSON_IDS  = (__ENV.LESSON_IDS  || 'lesson-1,lesson-2,lesson-3').split(',');

// ── Main scenario ─────────────────────────────────────────────────────────────
export default function () {
  const user = randomItem(TEST_USERS);
  let authToken = '';

  group('01_authentication', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    });

    loginDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'login 200':         (r) => r.status === 200,
      'has access token':  (r) => !!r.json('data.accessToken'),
    });
    loginSuccess.add(ok);

    if (ok) authToken = res.json('data.accessToken');
  });

  if (!authToken) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  sleep(randomBetween(0.5, 2)); // Simulate browsing

  group('02_browse_catalog', () => {
    const res = http.get(`${BASE_URL}/courses/catalog?page=1&limit=12`, {
      headers, tags: { name: 'catalog' },
    });
    totalRequests.add(1);
    check(res, { 'catalog 200': (r) => r.status === 200 });
  });

  sleep(randomBetween(1, 3));

  group('03_course_detail', () => {
    const courseId = randomItem(COURSE_IDS);
    const res = http.get(`${BASE_URL}/courses/${courseId}`, {
      headers, tags: { name: 'course_detail' },
    });
    totalRequests.add(1);
    check(res, { 'course detail 200': (r) => r.status === 200 || r.status === 404 });
  });

  sleep(randomBetween(0.5, 1.5));

  group('04_dashboard_progress', () => {
    const courseId = randomItem(COURSE_IDS);
    const res = http.get(`${BASE_URL}/progress/course/${courseId}`, {
      headers, tags: { name: 'dashboard_progress' },
    });
    totalRequests.add(1);
    check(res, { 'progress 200 or 403': (r) => [200, 403].includes(r.status) });
  });

  sleep(randomBetween(2, 5)); // Watch video

  group('05_update_progress', () => {
    const lessonId = randomItem(LESSON_IDS);
    const start = Date.now();
    const res = http.post(`${BASE_URL}/progress/lesson/${lessonId}`, JSON.stringify({
      watchPercentage: randomBetween(10, 95),
      lastPosition: randomBetween(0, 3600),
      timeWatched: randomBetween(30, 600),
    }), { headers, tags: { name: 'update_progress' } });

    progressDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'progress update ok': (r) => [200, 201, 403].includes(r.status),
    });
    progressErrors.add(!ok);
  });

  sleep(randomBetween(1, 3));

  group('06_notifications', () => {
    const res = http.get(`${BASE_URL}/notifications?limit=10`, {
      headers, tags: { name: 'notifications' },
    });
    totalRequests.add(1);
    check(res, { 'notifications ok': (r) => r.status === 200 });
  });

  sleep(randomBetween(0.5, 2));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const rps  = data.metrics.http_reqs?.values?.rate || 0;
  const errRate = data.metrics.http_req_failed?.values?.rate || 0;

  console.log('\n═══════════════════════════════════════');
  console.log('   1,000 CONCURRENT LEARNERS RESULTS   ');
  console.log('═══════════════════════════════════════');
  console.log(`  Peak VUs:     1,000`);
  console.log(`  RPS:          ${rps.toFixed(1)}`);
  console.log(`  P95 latency:  ${p95.toFixed(0)}ms`);
  console.log(`  P99 latency:  ${p99.toFixed(0)}ms`);
  console.log(`  Error rate:   ${(errRate * 100).toFixed(2)}%`);
  console.log('═══════════════════════════════════════\n');

  return {
    'load-tests/results/1k-learners-summary.json': JSON.stringify(data, null, 2),
  };
}
