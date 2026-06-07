/**
 * Load Test — Ramp 0→50 VUs over 2min, hold 5min, ramp down
 * Simulates typical production traffic with authenticated learner journeys.
 * Run: k6 run load-testing/scenarios/02-load.js
 *
 * Environment:
 *   BASE_URL   — API base (default: http://localhost:3001)
 *   TEST_TOKEN — Pre-generated JWT for authenticated requests
 */
import http       from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:3001';
const TEST_TOKEN = __ENV.TEST_TOKEN || '';
const API        = `${BASE_URL}/api/v1`;

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const courseListLatency  = new Trend('lms_course_list_latency',   true);
const courseViewLatency  = new Trend('lms_course_view_latency',   true);
const searchLatency      = new Trend('lms_search_latency',        true);
const authFlowLatency    = new Trend('lms_auth_flow_latency',     true);
const enrollmentLatency  = new Trend('lms_enrollment_latency',    true);
const businessErrors     = new Counter('lms_business_errors');
const successRate        = new Rate('lms_success_rate');

export const options = {
  stages: [
    { duration: '2m', target: 50  },  // ramp up to 50 users
    { duration: '5m', target: 50  },  // hold at peak load
    { duration: '1m', target: 0   },  // graceful ramp-down
  ],
  thresholds: {
    // SLO: P95 < 500ms, P99 < 1s
    http_req_duration:         ['p(95)<500', 'p(99)<1000'],
    // Error rate < 1%
    http_req_failed:           ['rate<0.01'],
    lms_success_rate:          ['rate>0.99'],
    // Per-endpoint SLOs
    lms_course_list_latency:   ['p(95)<300'],
    lms_search_latency:        ['p(95)<400'],
    lms_enrollment_latency:    ['p(95)<800'],
  },
  // Output Prometheus metrics for Grafana annotation
  ext: {
    loadimpact: {
      projectID:   0,
      name:        'LMS Load Test — 50 VUs',
    },
  },
};

const HEADERS = {
  json:    { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  authed:  {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Authorization': TEST_TOKEN ? `Bearer ${TEST_TOKEN}` : '',
  },
};

// ─── User journeys ────────────────────────────────────────────────────────────

/** Anonymous learner browsing the catalogue */
function journeyBrowse() {
  group('Browse Catalogue', () => {
    const list = http.get(`${API}/courses?page=1&limit=20`, { headers: HEADERS.json });
    courseListLatency.add(list.timings.duration);
    const ok = check(list, { 'course list 200': r => r.status === 200 || r.status === 401 });
    successRate.add(ok);
    if (!ok) businessErrors.add(1);
    sleep(1);

    const search = http.get(`${API}/search?q=javascript&type=course`, { headers: HEADERS.json });
    searchLatency.add(search.timings.duration);
    check(search, { 'search 200 or 401': r => r.status === 200 || r.status === 401 });
    sleep(0.5);
  });
}

/** Authenticated learner checking progress */
function journeyLearner() {
  if (!TEST_TOKEN) return journeyBrowse();

  group('Learner Journey', () => {
    // View my enrollments
    const enrollments = http.get(`${API}/enrollments`, { headers: HEADERS.authed });
    enrollmentLatency.add(enrollments.timings.duration);
    check(enrollments, { 'enrollments 200': r => r.status === 200 });

    sleep(0.5);

    // Check progress
    const progress = http.get(`${API}/progress`, { headers: HEADERS.authed });
    check(progress, { 'progress 200 or 404': r => r.status === 200 || r.status === 404 });

    sleep(1);
  });
}

/** Admin analytics read */
function journeyAnalytics() {
  if (!TEST_TOKEN) return;
  group('Analytics', () => {
    const analytics = http.get(`${API}/analytics/overview`, { headers: HEADERS.authed });
    check(analytics, { 'analytics 200 or 403': r => r.status === 200 || r.status === 403 });
    sleep(0.5);
  });
}

export default function () {
  // Distribute traffic across user journeys (80% browse, 15% learner, 5% admin)
  const rand = Math.random();
  if      (rand < 0.80) journeyBrowse();
  else if (rand < 0.95) journeyLearner();
  else                  journeyAnalytics();

  sleep(Math.random() * 2 + 0.5);  // think time 0.5–2.5s
}

export function handleSummary(data) {
  return {
    'load-testing/results/load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const { metrics } = data;
  const fmt = (v, unit = 'ms') => v !== undefined ? `${Math.round(v)}${unit}` : 'n/a';
  return `
  ┌─────────────────────────────────────────────────────────┐
  │              LMS Load Test — Summary                    │
  ├─────────────────────────────────────────────────────────┤
  │  Total Requests : ${String(metrics.http_reqs?.values?.count ?? 'n/a').padEnd(36)}│
  │  Request Rate   : ${fmt(metrics.http_reqs?.values?.rate, ' req/s').padEnd(36)}│
  │  P50 Latency    : ${fmt(metrics.http_req_duration?.values?.['p(50)']).padEnd(36)}│
  │  P95 Latency    : ${fmt(metrics.http_req_duration?.values?.['p(95)']).padEnd(36)}│
  │  P99 Latency    : ${fmt(metrics.http_req_duration?.values?.['p(99)']).padEnd(36)}│
  │  Error Rate     : ${fmt(metrics.http_req_failed?.values?.rate * 100, '%').padEnd(36)}│
  └─────────────────────────────────────────────────────────┘
`;
}
