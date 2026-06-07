# LMS Platform — Incident Response Runbooks

## On-call checklist

1. Check Grafana: http://localhost:3100
2. Check Alertmanager: http://localhost:9093
3. Check pm2 status: `pm2 status && pm2 logs lms-api --lines 50`
4. Check Docker containers: `docker ps`

---

## Runbook: API Down

**Alert:** `APIDown` — severity critical

**Symptoms:** All health checks return non-200. Grafana shows 0 RPS.

**Steps:**
```bash
# 1. Check pm2 status
pm2 status

# 2. If stopped, restart
pm2 restart lms-api

# 3. Check for port conflict
netstat -an | findstr :3001

# 4. Check startup logs
pm2 logs lms-api --lines 100 --nostream

# 5. If crash-looping, check for missing env vars
pm2 env 0 | findstr -i "database\|redis\|jwt"

# 6. Manually start to see full error output
cd apps/api
node ../../node_modules/ts-node/dist/bin.js --transpile-only src/main.ts
```

---

## Runbook: Database Connection Failure

**Alert:** `DatabaseCircuitOpen` — severity critical

**Symptoms:** `pg_up=0`, all API endpoints return 500.

**Steps:**
```bash
# 1. Check container
docker ps | findstr postgres

# 2. If stopped
docker start djib-taxi-db

# 3. Test connection
docker exec djib-taxi-db psql -U postgres -c "SELECT 1;" lms

# 4. Check disk space (full disk kills postgres)
docker exec djib-taxi-db df -h

# 5. Restart API to reset circuit breaker
pm2 restart lms-api

# 6. Verify circuit closed
curl http://localhost:3001/api/v1/health/detailed | jq .data.circuitBreakers
```

---

## Runbook: Stripe Payment Failures

**Alert:** `StripeCircuitOpen` — severity critical

**Symptoms:** Circuit breaker OPEN. New payments queued, not processed.

**Steps:**
```bash
# 1. Check Stripe status page: https://status.stripe.com

# 2. Check circuit state via API
curl http://localhost:3001/api/v1/health/detailed | jq .data.circuitBreakers.stripe

# 3. View retry queue depth
curl http://localhost:9090/api/v1/query?query=lms_queue_depth | jq

# 4. If Stripe is back up but circuit is OPEN, force reset:
#    (circuit auto-resets after 60s in HALF_OPEN)
pm2 restart lms-api

# 5. Monitor retry queue draining
watch -n 30 'curl -s http://localhost:9090/api/v1/query?query=lms_queue_depth | jq .data.result'

# 6. Notify customers if >1h delay (use notifications API)
```

---

## Runbook: High Latency

**Alert:** `HighLatencyP95` — severity warning

**Symptoms:** P95 > 1s sustained for 10+ minutes.

**Steps:**
```bash
# 1. Check DB query latency
curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(lms_db_query_duration_seconds_bucket[5m]))"

# 2. Check Redis latency
curl "http://localhost:9090/api/v1/query?query=redis_commands_duration_seconds_total"

# 3. Check node memory (GC pressure)
curl "http://localhost:9090/api/v1/query?query=lms_node_nodejs_heap_size_used_bytes"

# 4. Check active connections
curl "http://localhost:9090/api/v1/query?query=lms_http_active_requests"

# 5. If memory leak suspected, restart API
pm2 restart lms-api

# 6. Scale horizontally if needed (K8s)
kubectl scale deployment lms-api --replicas=3 -n lms
```

---

## Runbook: Redis Down

**Alert:** `RedisDown` — severity warning

**Symptoms:** `redis_up=0`. Cache misses spike. Some Bull queue features degrade.

**Steps:**
```bash
# 1. Check Redis container
docker ps | findstr redis
docker start lms-redis

# 2. Test connection
docker exec lms-redis redis-cli PING

# 3. Check memory usage
docker exec lms-redis redis-cli INFO memory | grep used_memory_human

# 4. The API has in-memory fallback cache — it will continue degraded
#    Confirm via: curl http://localhost:3001/api/v1/health/detailed
#    Look for: "cache": { "status": "memory-fallback" }

# 5. Reconnect redis-exporter to monitoring network
docker network connect monitoring_monitoring lms-redis-exporter
```

---

## Runbook: Disk Space Low

**Symptoms:** Host disk > 85%. Postgres may refuse writes.

```bash
# Check disk
df -h

# Find large files
du -sh /var/lib/docker/volumes/* | sort -rh | head -10

# Prune old Docker data
docker system prune -f

# Prune old backups (keep last 7 days)
bash scripts/backup/backup.sh --dry-run  # see what would be deleted
find backups/ -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +

# Truncate Prometheus data if needed (this loses metrics history)
# docker exec lms-prometheus sh -c 'rm -rf /prometheus/chunks_head/* /prometheus/wal/*'
```

---

## Escalation

| Severity | Response Time | Escalation |
|---|---|---|
| Critical | 15 minutes | PagerDuty → on-call engineer |
| High | 1 hour | Slack #incidents |
| Warning | Next business day | Jira ticket |

## Useful Commands

```bash
# Full status check
pm2 status
docker ps --format "table {{.Names}}\t{{.Status}}"
curl -s http://localhost:3001/api/v1/health | jq
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'

# Live log tailing
pm2 logs lms-api

# Prometheus query
curl "http://localhost:9090/api/v1/query?query=up" | jq '.data.result[] | {job: .metric.job, up: .value[1]}'
```
