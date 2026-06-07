/**
 * Soak Test — 30 VUs × 30min
 * Detects memory leaks, connection pool exhaustion, and gradual degradation.
 * Run: k6 run load-testing/scenarios/04-soak.js
 */
import http  from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const API         = `${(__ENV.BASE_URL || 'http://localhost:3001')}/api/v1`;
const p95         = new Trend('lms_soak_p95', true);
const successRate = new Rate('lms_soak_success');

export const options = {
  vus:      30,
  duration: '30m',
  thresholds: {
    // P95 must NOT degrade over time
    http_req_duration: ['p(95)<500'],
    lms_soak_success:  ['rate>0.995'],
  },
};

export default function () {
  const endpoints = [
    `${API}/health`,
    `${API}/health/ready`,
    `${API}/metrics`,
    `${API}/courses`,
  ];

  for (const url of endpoints) {
    const r = http.get(url, { headers: { Accept: 'application/json' } });
    p95.add(r.timings.duration);
    successRate.add(check(r, { '2xx or 4xx': res => res.status < 500 }));
    sleep(0.3);
  }
  sleep(2);
}
