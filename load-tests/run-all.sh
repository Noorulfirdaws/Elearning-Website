#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LearnHub LMS — Full Load Test Suite
# Runs all four load scenarios sequentially and produces a combined report.
#
# Prerequisites:
#   brew install k6   (macOS)
#   winget install k6 (Windows)
#   apt install k6    (Ubuntu)
#
# Usage:
#   API_URL=https://api.yourlms.com ./load-tests/run-all.sh
#   API_URL=http://localhost:4000/api/v1 ./load-tests/run-all.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api/v1}"
CDN_URL="${CDN_URL:-https://cdn.yourlms.com}"
RESULTS_DIR="load-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   LearnHub LMS — Load Test Suite             ║"
echo "║   Target: ${API_URL}"
echo "║   Started: $(date)"
echo "╚══════════════════════════════════════════════╝"
echo ""

mkdir -p "$RESULTS_DIR"

# ── Seed test data ────────────────────────────────────────────────────────────
echo "▶ Seeding load test users..."
node load-tests/seed.js --api "$API_URL" --users 200 || echo "⚠ Seeding skipped (may already exist)"
echo ""

# ── 1. Smoke test (ensure service is healthy before full load) ────────────────
echo "▶ [1/5] Smoke test (5 users, 30s)..."
k6 run \
  --vus 5 \
  --duration 30s \
  --env API_URL="$API_URL" \
  --out json="$RESULTS_DIR/smoke-${TIMESTAMP}.json" \
  load-tests/k6-1k-learners.js
echo "✓ Smoke test passed"
echo ""

# ── 2. 1,000 concurrent learners ─────────────────────────────────────────────
echo "▶ [2/5] 1,000 concurrent learners (13 min)..."
k6 run \
  --env API_URL="$API_URL" \
  --out json="$RESULTS_DIR/1k-${TIMESTAMP}.json" \
  load-tests/k6-1k-learners.js
echo "✓ 1K test complete"
echo ""

# ── 3. Video playback spike ───────────────────────────────────────────────────
echo "▶ [3/5] Video playback spike (14 min)..."
k6 run \
  --env API_URL="$API_URL" \
  --env CDN_URL="$CDN_URL" \
  --out json="$RESULTS_DIR/video-spike-${TIMESTAMP}.json" \
  load-tests/k6-video-spike.js
echo "✓ Video spike test complete"
echo ""

# ── 4. Quiz submission burst ──────────────────────────────────────────────────
echo "▶ [4/5] Quiz submission burst (12 min)..."
k6 run \
  --env API_URL="$API_URL" \
  --out json="$RESULTS_DIR/quiz-burst-${TIMESTAMP}.json" \
  load-tests/k6-quiz-burst.js
echo "✓ Quiz burst test complete"
echo ""

# ── 5. 10,000 concurrent learners (requires k6 Cloud or distributed setup) ───
echo "▶ [5/5] 10,000 concurrent learners (26 min)..."
if command -v k6 >/dev/null && k6 version | grep -q "cloud"; then
  k6 cloud \
    --env API_URL="$API_URL" \
    load-tests/k6-10k-learners.js
else
  echo "  ℹ k6 Cloud not configured — running locally (reduced VUs)..."
  k6 run \
    --vus 500 \
    --env API_URL="$API_URL" \
    --out json="$RESULTS_DIR/10k-local-${TIMESTAMP}.json" \
    load-tests/k6-10k-learners.js
fi
echo "✓ 10K test complete"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════"
echo "  All load tests complete!"
echo "  Results saved to: $RESULTS_DIR/"
echo "  Timestamp: $TIMESTAMP"
echo "════════════════════════════════════════════════"
echo ""
echo "To view results: cat load-tests/results/1k-${TIMESTAMP}.json | jq .metrics"
