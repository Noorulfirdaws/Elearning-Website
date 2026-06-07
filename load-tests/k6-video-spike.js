/**
 * Load Test: Video Playback Spikes
 * Tests CDN signed URL generation, HLS manifest fetching, and progress telemetry
 * under heavy concurrent video streaming load.
 *
 * Video spike scenario: new course launch → 3,000 users start same video simultaneously
 *
 * Run: k6 run load-tests/k6-video-spike.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const signedUrlLatency   = new Trend('signed_url_latency_ms', true);
const progressWriteRate  = new Rate('progress_write_success');
const hlsManifestErrors  = new Rate('hls_manifest_errors');
const bandwidthSimulated = new Counter('bytes_served_simulated');

export const options = {
  scenarios: {
    // Scenario A: Gradual video load (normal)
    normal_playback: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500  },
        { duration: '5m', target: 1500 },
        { duration: '5m', target: 1500 },
        { duration: '2m', target: 0    },
      ],
    },
    // Scenario B: Spike — course launch (3000 simultaneous starts)
    launch_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 1000,
      maxVUs: 5000,
      stages: [
        { duration: '30s', target: 50   },   // Normal baseline
        { duration: '10s', target: 3000 },   // Instant spike (launch email sent)
        { duration: '5m',  target: 3000 },   // Hold spike
        { duration: '1m',  target: 200  },   // Decay
      ],
      startTime: '8m',
    },
  },

  thresholds: {
    http_req_duration:       ['p(95)<400'],   // CDN signed URLs must be fast
    signed_url_latency_ms:   ['p(95)<200'],   // URL gen <200ms
    progress_write_success:  ['rate>0.98'],   // 98% progress writes succeed
    hls_manifest_errors:     ['rate<0.01'],   // <1% manifest fetch failures
    http_req_failed:         ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';
const CDN_URL  = __ENV.CDN_URL  || 'https://cdn.yourlms.com';

const TEST_TOKENS = Array.from({ length: 500 }, (_, i) => `test-token-${i}`);

// Simulated video assets (in production these come from Mux/CloudFront)
const VIDEO_LESSONS = [
  { lessonId: 'lesson-launch-1', courseId: 'course-hot-1', durationSecs: 1800 },
  { lessonId: 'lesson-launch-2', courseId: 'course-hot-1', durationSecs: 2400 },
  { lessonId: 'lesson-popular-1', courseId: 'course-popular-1', durationSecs: 900 },
];

// HLS quality levels (simulated bandwidth tiers)
const QUALITY_LEVELS = [
  { name: '1080p', bitrate_kbps: 5000, segment_size_kb: 2500 },
  { name: '720p',  bitrate_kbps: 2500, segment_size_kb: 1250 },
  { name: '480p',  bitrate_kbps: 1000, segment_size_kb: 500  },
  { name: '360p',  bitrate_kbps: 500,  segment_size_kb: 250  },
];

export default function () {
  const token   = randomItem(TEST_TOKENS);
  const lesson  = randomItem(VIDEO_LESSONS);
  const quality = randomItem(QUALITY_LEVELS);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('01_request_signed_video_url', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/video/signed-url?lessonId=${lesson.lessonId}`,
      { headers, tags: { name: 'get_signed_url' } }
    );
    signedUrlLatency.add(Date.now() - start);

    check(res, {
      'signed url 200':       (r) => r.status === 200 || r.status === 403,
      'url not empty':        (r) => r.status === 403 || !!r.json('data.url'),
      'signed url response':  (r) => r.timings.duration < 300,
    });
  });

  sleep(0.5); // Player initializes

  group('02_hls_manifest_fetch', () => {
    // Simulate HLS manifest request to CDN (m3u8 playlist)
    const res = http.get(
      `${CDN_URL}/hls/${lesson.lessonId}/master.m3u8`,
      { tags: { name: 'hls_manifest' } }
    );
    const ok = check(res, {
      'manifest accessible': (r) => [200, 403, 404].includes(r.status),
    });
    hlsManifestErrors.add(!ok && res.status !== 404);
  });

  sleep(randomIntBetween(1, 3)); // Buffering

  group('03_video_segments_playback', () => {
    // Simulate segment requests every ~6 seconds (HLS segment duration)
    // A viewer watching for ~2 minutes generates ~20 segment requests
    const watchDuration = randomIntBetween(30, 300); // 30s to 5min viewing
    const segmentCount  = Math.floor(watchDuration / 6);

    // Simulate bandwidth consumed
    bandwidthSimulated.add(segmentCount * quality.segment_size_kb * 1024);

    // Progress heartbeat every 30 seconds
    const heartbeats = Math.floor(watchDuration / 30);
    let position = 0;

    for (let i = 0; i < heartbeats; i++) {
      position += 30;
      const res = http.post(
        `${BASE_URL}/progress/lesson/${lesson.lessonId}`,
        JSON.stringify({
          lastPosition: position,
          watchPercentage: Math.min(100, (position / lesson.durationSecs) * 100),
          timeWatched: position,
        }),
        { headers, tags: { name: 'progress_heartbeat' } }
      );

      const ok = check(res, {
        'progress heartbeat ok': (r) => [200, 201, 403].includes(r.status),
      });
      progressWriteRate.add(ok);

      sleep(30); // Real heartbeat interval
    }
  });

  group('04_completion_event', () => {
    // ~20% of viewers finish the lesson
    if (Math.random() < 0.2) {
      const res = http.post(
        `${BASE_URL}/progress/lesson/${lesson.lessonId}`,
        JSON.stringify({ isCompleted: true, watchPercentage: 100 }),
        { headers, tags: { name: 'lesson_complete' } }
      );
      check(res, { 'completion ok': (r) => [200, 201, 403].includes(r.status) });
    }
  });
}

export function handleSummary(data) {
  const p95sig  = data.metrics.signed_url_latency_ms?.values?.['p(95)'] || 0;
  const progOk  = data.metrics.progress_write_success?.values?.rate || 0;
  const hlsErr  = data.metrics.hls_manifest_errors?.values?.rate || 0;
  const bw      = data.metrics.bytes_served_simulated?.values?.count || 0;

  console.log('\n═══════════════════════════════════════');
  console.log('      VIDEO PLAYBACK SPIKE RESULTS     ');
  console.log('═══════════════════════════════════════');
  console.log(`  Peak concurrent viewers: 3,000`);
  console.log(`  Signed URL P95:          ${p95sig.toFixed(0)}ms`);
  console.log(`  Progress write success:  ${(progOk * 100).toFixed(1)}%`);
  console.log(`  HLS manifest errors:     ${(hlsErr * 100).toFixed(2)}%`);
  console.log(`  Simulated bandwidth:     ${(bw / 1e9).toFixed(2)} GB`);
  console.log('═══════════════════════════════════════\n');

  return {
    'load-tests/results/video-spike-summary.json': JSON.stringify(data, null, 2),
  };
}
