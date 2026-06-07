/**
 * Load Test: Quiz Submission Bursts
 * Simulates an instructor-led live session where 500–2,000 learners
 * simultaneously submit a quiz at the end of a webinar/lecture.
 *
 * Critical path: submit → grade → update enrollment → issue certificate
 *
 * Run: k6 run load-tests/k6-quiz-burst.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const submissionLatency  = new Trend('quiz_submission_latency_ms', true);
const gradingLatency     = new Trend('quiz_grading_latency_ms', true);
const submissionSuccess  = new Rate('quiz_submission_success');
const duplicateAttempts  = new Rate('duplicate_attempt_rate');
const certificatesIssued = new Counter('certificates_issued');
const queueDepth         = new Gauge('estimated_queue_depth');

export const options = {
  scenarios: {
    // Normal quiz-end submissions (staggered finishing)
    normal_finish: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },   // Students finishing quiz
        { duration: '3m', target: 200 },   // Sustained finish rate
        { duration: '2m', target: 0   },
      ],
    },
    // Burst: instructor hits "End Quiz" — everyone submits at once
    synchronized_burst: {
      executor: 'arrival-rate',
      rate: 2000,          // 2,000 submissions per second burst
      timeUnit: '1s',
      duration: '30s',     // 30-second burst window
      preAllocatedVUs: 2000,
      maxVUs: 3000,
      startTime: '6m',     // Triggered during normal_finish phase
    },
    // Edge case: retry storm (students re-submitting on failure)
    retry_storm: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 200,
      maxVUs: 500,
      startTime: '10m',
    },
  },

  thresholds: {
    quiz_submission_latency_ms: ['p(95)<1000', 'p(99)<3000'],  // Submit <1s P95
    quiz_grading_latency_ms:    ['p(95)<2000'],                 // Grading <2s P95
    quiz_submission_success:    ['rate>0.995'],                 // 99.5% submissions succeed
    duplicate_attempt_rate:     ['rate<0.05'],                  // <5% duplicates
    http_req_failed:            ['rate<0.01'],
    http_req_duration:          ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

// Pre-generated test quiz questions and answer sets
const QUIZ_IDS = ['quiz-final-1', 'quiz-midterm-1', 'quiz-module-3'];

function generateAnswers(questionCount = 10) {
  const options = ['A', 'B', 'C', 'D'];
  return Array.from({ length: questionCount }, (_, i) => ({
    questionId: `question-${i + 1}`,
    answer: randomItem(options),
  }));
}

const TEST_TOKENS = Array.from({ length: 2000 }, (_, i) => `bearer-token-${i}`);

export default function () {
  const token  = randomItem(TEST_TOKENS);
  const quizId = randomItem(QUIZ_IDS);
  const headers = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
  };

  let attemptId = '';

  // ── Phase 1: Start quiz attempt ───────────────────────────────────────────
  group('01_start_attempt', () => {
    const res = http.post(
      `${BASE_URL}/quizzes/${quizId}/attempt`,
      JSON.stringify({}),
      { headers, tags: { name: 'quiz_start' } }
    );

    const ok = check(res, {
      'start attempt ok':         (r) => [200, 201, 403, 404].includes(r.status),
      'attempt id returned':      (r) => r.status !== 200 || !!r.json('data.id'),
      'not max attempts':         (r) => r.status !== 429,
    });

    if (res.status === 200 || res.status === 201) {
      attemptId = res.json('data.id') || '';
    }
  });

  if (!attemptId) {
    sleep(1);
    return;
  }

  // ── Phase 2: Answer questions (realistic think time) ─────────────────────
  const thinkTime = randomIntBetween(60, 900); // 1–15 min quiz duration
  sleep(Math.min(thinkTime, 10)); // Compress for test (max 10s sleep)

  // ── Phase 3: Submit quiz ──────────────────────────────────────────────────
  group('02_submit_quiz', () => {
    const answers = generateAnswers(randomIntBetween(5, 20));
    const start = Date.now();

    const res = http.post(
      `${BASE_URL}/quizzes/attempt/${attemptId}/submit`,
      JSON.stringify({ answers }),
      { headers, tags: { name: 'quiz_submit' } }
    );

    submissionLatency.add(Date.now() - start);
    queueDepth.add(1);

    const ok = check(res, {
      'submission accepted':  (r) => [200, 201, 202].includes(r.status),
      'score returned':       (r) => r.status === 200 ? res.json('data.score') !== undefined : true,
      'not a duplicate':      (r) => r.status !== 409,
    });

    submissionSuccess.add(ok);
    duplicateAttempts.add(res.status === 409);

    if (!ok) {
      // Simulate learner retry
      sleep(2);
      const retryRes = http.post(
        `${BASE_URL}/quizzes/attempt/${attemptId}/submit`,
        JSON.stringify({ answers }),
        { headers, tags: { name: 'quiz_retry' } }
      );
      check(retryRes, { 'retry ok': (r) => [200, 201, 409].includes(r.status) });
    }

    queueDepth.add(-1);
  });

  // ── Phase 4: Poll for grading result (async grading) ─────────────────────
  group('03_poll_grade_result', () => {
    let gradeReceived = false;
    let pollCount = 0;
    const maxPolls = 5;
    const start = Date.now();

    while (!gradeReceived && pollCount < maxPolls) {
      sleep(1);
      const res = http.get(
        `${BASE_URL}/quizzes/attempt/${attemptId}`,
        { headers, tags: { name: 'poll_grade' } }
      );

      gradeReceived = check(res, {
        'grade available':  (r) => r.status === 200 && r.json('data.score') !== null,
        'grading complete': (r) => r.status !== 202, // 202 = still grading
      });

      pollCount++;
    }

    gradingLatency.add(Date.now() - start);
  });

  // ── Phase 5: Check for certificate ───────────────────────────────────────
  group('04_certificate_check', () => {
    // Only ~60% of attempts pass and trigger certificate
    if (Math.random() < 0.6) {
      const res = http.get(
        `${BASE_URL}/certificates/my`,
        { headers, tags: { name: 'certificate_check' } }
      );
      const hasCert = check(res, {
        'certificate endpoint ok': (r) => [200, 404].includes(r.status),
      });
      if (hasCert && res.status === 200) {
        certificatesIssued.add(1);
      }
    }
  });

  sleep(randomIntBetween(1, 3));
}

export function handleSummary(data) {
  const p95sub  = data.metrics.quiz_submission_latency_ms?.values?.['p(95)'] || 0;
  const p95grade = data.metrics.quiz_grading_latency_ms?.values?.['p(95)'] || 0;
  const success = data.metrics.quiz_submission_success?.values?.rate || 0;
  const dups    = data.metrics.duplicate_attempt_rate?.values?.rate || 0;
  const certs   = data.metrics.certificates_issued?.values?.count || 0;
  const reqs    = data.metrics.http_reqs?.values?.count || 0;

  console.log('\n═══════════════════════════════════════');
  console.log('      QUIZ SUBMISSION BURST RESULTS    ');
  console.log('═══════════════════════════════════════');
  console.log(`  Peak burst rate:      2,000 submissions/sec`);
  console.log(`  Total requests:       ${reqs.toLocaleString()}`);
  console.log(`  Submission P95:       ${p95sub.toFixed(0)}ms`);
  console.log(`  Grading P95:          ${p95grade.toFixed(0)}ms`);
  console.log(`  Success rate:         ${(success * 100).toFixed(2)}%`);
  console.log(`  Duplicate rate:       ${(dups * 100).toFixed(2)}%`);
  console.log(`  Certificates issued:  ${certs}`);
  console.log('═══════════════════════════════════════\n');

  return {
    'load-tests/results/quiz-burst-summary.json': JSON.stringify(data, null, 2),
  };
}
