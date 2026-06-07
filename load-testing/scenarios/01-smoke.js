/**
 * Smoke Test — 2 VUs × 30s
 * Verifies baseline functionality before any serious load.
 * Run: k6 run load-testing/scenarios/01-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API      = `${BASE_URL}/api/v1`;

// Custom metrics
const apiLatency  = new Trend('lms_api_latency',   true);
const authLatency = new Trend('lms_auth_latency',  true);
const errorCount  = new Counter('lms_errors');
const successRate = new Rate('lms_success_rate');

export const options = {
  vus:        2,
  duration:   '30s',
  thresholds: {
    http_req_duration:   ['p(95)<500'],
    http_req_failed:     ['rate<0.01'],
    lms_success_rate:    ['rate>0.99'],
  },
};

export default function () {
  // ── Health check ─────────────────────────────────────────────────────────
  const health = http.get(`${API}/health`);
  apiLatency.add(health.timings.duration);
  const healthOk = check(health, {
    'health 200':             (r) => r.status === 200,
    'health body has status': (r) => JSON.parse(r.body).data?.status === 'ok',
  });
  successRate.add(healthOk);
  if (!healthOk) errorCount.add(1);

  sleep(0.5);

  // ── Metrics endpoint ──────────────────────────────────────────────────────
  const metrics = http.get(`${API}/metrics`);
  const metricsOk = check(metrics, {
    'metrics 200':             (r) => r.status === 200,
    'metrics has HELP lines':  (r) => r.body.includes('# HELP'),
  });
  successRate.add(metricsOk);
  if (!metricsOk) errorCount.add(1);

  sleep(0.5);

  // ── Public course listing ────────────────────────────────────────────────
  const courses = http.get(`${API}/courses`, {
    headers: { Accept: 'application/json' },
  });
  const coursesOk = check(courses, {
    'courses status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  successRate.add(coursesOk);

  sleep(1);
}
