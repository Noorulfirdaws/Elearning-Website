/**
 * Stress Test — Pushes beyond normal capacity to find the breaking point.
 * Ramps to 200 VUs over 7 minutes.
 * Run: k6 run load-testing/scenarios/03-stress.js
 */
import http  from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API         = `${(__ENV.BASE_URL || 'http://localhost:3001')}/api/v1`;
const successRate = new Rate('lms_success_rate');
const p99Latency  = new Trend('lms_p99_latency', true);

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],   // relaxed for stress test
    http_req_failed:   ['rate<0.05'],    // allow up to 5% errors at peak
  },
};

export default function () {
  const r = http.get(`${API}/health`);
  p99Latency.add(r.timings.duration);
  successRate.add(check(r, { 'ok': res => res.status === 200 }));
  sleep(0.2);
}
