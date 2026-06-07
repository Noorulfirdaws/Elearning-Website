/**
 * k6 Load Testing Configuration
 * All thresholds are tuned for the LMS platform SLOs.
 */
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
export const API      = `${BASE_URL}/api/v1`;

export const THRESHOLDS = {
  // P95 latency < 500ms for all requests
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  // Error rate < 1%
  http_req_failed: ['rate<0.01'],
  // At least 100 req/s throughput
  http_reqs: ['rate>100'],
};

// Staged ramp-up profile: smoke → load → stress → spike → soak
export const SCENARIOS = {
  smoke: {
    executor:   'constant-vus',
    vus:        2,
    duration:   '30s',
    tags:       { scenario: 'smoke' },
  },
  load: {
    executor:   'ramping-vus',
    startVUs:   0,
    stages:     [
      { duration: '2m', target: 50 },   // ramp up
      { duration: '5m', target: 50 },   // hold
      { duration: '1m', target: 0  },   // ramp down
    ],
    tags:       { scenario: 'load' },
  },
  stress: {
    executor:   'ramping-vus',
    startVUs:   0,
    stages:     [
      { duration: '2m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '2m', target: 0  },
    ],
    tags:       { scenario: 'stress' },
  },
  spike: {
    executor:   'ramping-vus',
    startVUs:   0,
    stages:     [
      { duration: '10s', target: 500 },  // instant spike
      { duration: '1m',  target: 500 },
      { duration: '10s', target: 0   },
    ],
    tags:       { scenario: 'spike' },
  },
  soak: {
    executor:   'constant-vus',
    vus:        30,
    duration:   '30m',
    tags:       { scenario: 'soak' },
  },
};
