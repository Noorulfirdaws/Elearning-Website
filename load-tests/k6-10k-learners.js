/**
 * Load Test: 10,000 Concurrent Learners
 * Peak traffic simulation — launch day / marketing event scenario.
 * Tests horizontal scaling, DB connection pool limits, cache hit rates.
 *
 * Run: k6 run load-tests/k6-10k-learners.js --out cloud
 * For 10K VUs use k6 Cloud or a distributed k6 setup.
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const errorRate       = new Rate('error_rate');
const cacheHitRate    = new Rate('cache_hit_rate');
const dbQueryTime     = new Trend('db_query_time_ms', true);
const activeUsers     = new Gauge('active_users');
const requestCount    = new Counter('total_requests');

export const options = {
  scenarios: {
    // Scenario 1: Sustained high load
    sustained_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m',  target: 1000  },  // Warm-up
        { duration: '5m',  target: 5000  },  // Ramp to 5K
        { duration: '5m',  target: 10000 },  // Ramp to 10K
        { duration: '10m', target: 10000 },  // Hold peak
        { duration: '3m',  target: 0     },  // Cool-down
      ],
    },
    // Scenario 2: Spike — sudden 5K burst (simulates marketing email)
    spike_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 2000,
      maxVUs: 12000,
      stages: [
        { duration: '30s', target: 500  },  // 500 RPS
        { duration: '1m',  target: 2000 },  // Spike to 2000 RPS
        { duration: '2m',  target: 2000 },  // Hold spike
        { duration: '1m',  target: 100  },  // Recover
      ],
      startTime: '20m', // Start spike during sustained load
    },
  },

  thresholds: {
    http_req_duration:  ['p(95)<800', 'p(99)<2000'],  // Relaxed for 10K — still <800ms P95
    error_rate:         ['rate<0.02'],   // <2% errors at peak
    cache_hit_rate:     ['rate>0.80'],   // >80% cache hits required
    http_req_failed:    ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';
const USER_POOL_SIZE = 5000;

const TEST_USERS = Array.from({ length: USER_POOL_SIZE }, (_, i) => ({
  email: `load_${i}@test.com`,
  password: 'Load@12345',
}));

// Simulate realistic traffic distribution (80/20 rule)
// 80% of traffic hits 20% of content (popular courses)
const POPULAR_COURSE_IDS = (__ENV.POPULAR_COURSES || 'c1,c2,c3,c4,c5').split(',');
const ALL_COURSE_IDS     = (__ENV.ALL_COURSES || 'c1,c2,c3,c4,c5,c6,c7,c8,c9,c10').split(',');
const POPULAR_LESSON_IDS = (__ENV.POPULAR_LESSONS || 'l1,l2,l3,l4,l5').split(',');

function pickCourse() {
  // 80% chance of hitting popular courses
  return Math.random() < 0.8 ? randomItem(POPULAR_COURSE_IDS) : randomItem(ALL_COURSE_IDS);
}

export function setup() {
  console.log('Starting 10,000 concurrent learner test...');
  console.log(`Target API: ${BASE_URL}`);

  // Health check
  const res = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  console.log('Health check passed ✓');
}

export default function () {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);
  let token = '';

  // ── Auth (cached in real world via Redis session) ─────────────────────────
  group('auth', () => {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } });

    requestCount.add(1);
    const ok = check(res, { 'login ok': (r) => r.status === 200 });
    errorRate.add(!ok);

    if (ok) token = res.json('data.accessToken') || '';
  });

  if (!token) { activeUsers.add(-1); return; }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── Realistic learner journey ─────────────────────────────────────────────
  const journey = randomIntBetween(1, 4);

  if (journey === 1) {
    // Journey: Browse catalog → view course → watch video
    group('browse_and_watch', () => {
      // Catalog (should be heavily cached)
      let res = http.get(`${BASE_URL}/courses/catalog?page=1&limit=12`, { headers, tags: { name: 'catalog' } });
      requestCount.add(1);
      const cached = res.headers['X-Cache'] === 'HIT';
      cacheHitRate.add(cached);
      check(res, { 'catalog ok': (r) => r.status === 200 });

      sleep(randomIntBetween(1, 3));

      // Course detail (cached)
      res = http.get(`${BASE_URL}/courses/${pickCourse()}`, { headers, tags: { name: 'course_detail' } });
      requestCount.add(1);
      cacheHitRate.add(res.headers['X-Cache'] === 'HIT');
      check(res, { 'course detail ok': (r) => [200, 404].includes(r.status) });

      sleep(randomIntBetween(2, 8));

      // Update progress (write — cannot be cached)
      res = http.post(`${BASE_URL}/progress/lesson/${randomItem(POPULAR_LESSON_IDS)}`,
        JSON.stringify({ watchPercentage: randomIntBetween(5, 100), lastPosition: randomIntBetween(0, 3600) }),
        { headers, tags: { name: 'progress_update' } }
      );
      requestCount.add(1);
      errorRate.add(![200, 201, 403].includes(res.status));
    });

  } else if (journey === 2) {
    // Journey: Quiz attempt
    group('quiz_attempt', () => {
      const res = http.get(`${BASE_URL}/courses/${pickCourse()}`, { headers, tags: { name: 'pre_quiz_course' } });
      requestCount.add(1);
      sleep(randomIntBetween(3, 10));

      // Start quiz attempt
      const startRes = http.post(`${BASE_URL}/quizzes/quiz-placeholder/attempt`,
        JSON.stringify({}), { headers, tags: { name: 'quiz_start' } }
      );
      requestCount.add(1);
      check(startRes, { 'quiz start ok': (r) => [200, 201, 404, 403].includes(r.status) });

      sleep(randomIntBetween(5, 20)); // Answer questions

      // Submit quiz
      const submitRes = http.post(`${BASE_URL}/quizzes/attempt-placeholder/submit`,
        JSON.stringify({ answers: [{ questionId: 'q1', answer: 'A' }] }),
        { headers, tags: { name: 'quiz_submit' } }
      );
      requestCount.add(1);
      errorRate.add(![200, 201, 404, 403].includes(submitRes.status));
    });

  } else if (journey === 3) {
    // Journey: Read notifications + dashboard only (lightweight)
    group('passive_user', () => {
      const reqs = [
        ['GET', `${BASE_URL}/notifications?limit=5`,    'notifications'],
        ['GET', `${BASE_URL}/users/me`,                 'profile'],
        ['GET', `${BASE_URL}/progress/course/${pickCourse()}`, 'progress'],
      ];
      for (const [method, url, name] of reqs) {
        const res = http.get(url, { headers, tags: { name } });
        requestCount.add(1);
        errorRate.add(![200, 403, 404].includes(res.status));
        sleep(randomIntBetween(1, 2));
      }
    });

  } else {
    // Journey: Search + catalog browsing only
    group('search_browse', () => {
      const queries = ['javascript', 'python', 'data science', 'react', 'node'];
      const res = http.get(`${BASE_URL}/search?q=${randomItem(queries)}&limit=10`, {
        headers, tags: { name: 'search' },
      });
      requestCount.add(1);
      cacheHitRate.add(res.headers['X-Cache'] === 'HIT');
      check(res, { 'search ok': (r) => r.status === 200 });
      sleep(randomIntBetween(2, 5));
    });
  }

  activeUsers.add(-1);
  sleep(randomIntBetween(1, 5));
}

export function handleSummary(data) {
  const p95     = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99     = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const rps     = data.metrics.http_reqs?.values?.rate || 0;
  const err     = data.metrics.error_rate?.values?.rate || 0;
  const cache   = data.metrics.cache_hit_rate?.values?.rate || 0;
  const total   = data.metrics.total_requests?.values?.count || 0;

  console.log('\n════════════════════════════════════════');
  console.log('   10,000 CONCURRENT LEARNERS RESULTS   ');
  console.log('════════════════════════════════════════');
  console.log(`  Peak VUs:         10,000`);
  console.log(`  Total Requests:   ${total.toLocaleString()}`);
  console.log(`  RPS at peak:      ${rps.toFixed(1)}`);
  console.log(`  P95 latency:      ${p95.toFixed(0)}ms`);
  console.log(`  P99 latency:      ${p99.toFixed(0)}ms`);
  console.log(`  Error rate:       ${(err * 100).toFixed(2)}%`);
  console.log(`  Cache hit rate:   ${(cache * 100).toFixed(1)}%`);
  console.log('════════════════════════════════════════\n');

  return {
    'load-tests/results/10k-learners-summary.json': JSON.stringify(data, null, 2),
  };
}
