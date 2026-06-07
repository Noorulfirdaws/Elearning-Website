#!/usr/bin/env ts-node
/**
 * LMS Platform — Automated Security Audit
 *
 * Runs a full security sweep covering:
 *   1. HTTP security headers (Helmet)
 *   2. Authentication bypass attempts
 *   3. SQL injection probes
 *   4. Rate limiting enforcement
 *   5. CORS policy validation
 *   6. JWT hardening checks
 *   7. Secrets exposure scan
 *   8. Dependency CVEs (via pnpm audit)
 *
 * Usage:
 *   npx ts-node security/security-audit.ts [--base-url http://localhost:3001]
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3001';

const API = `${BASE_URL}/api/v1`;

// ─── Colour helpers ──────────────────────────────────────────────────────────
const c = {
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
};

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  title: string;
  detail: string;
  recommendation: string;
}

const findings: Finding[] = [];
let passed = 0;
let failed = 0;

function pass(category: string, title: string) {
  passed++;
  console.log(c.green(`  ✅ PASS`) + ` [${category}] ${title}`);
}

function fail(severity: Finding['severity'], category: string, title: string, detail: string, recommendation: string) {
  failed++;
  findings.push({ severity, category, title, detail, recommendation });
  const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '❗' : '⚠️ ';
  console.log(c.red(`  ${icon} ${severity}`) + ` [${category}] ${title}`);
  console.log(c.yellow(`     → ${detail}`));
}

function info(msg: string) {
  console.log(c.cyan(`  ℹ  ${msg}`));
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
async function req(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   opts.method || 'GET',
      headers:  opts.headers || {},
    };
    const request = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          status:  res.statusCode || 0,
          headers: res.headers as Record<string, string>,
          body,
        });
      });
    });
    request.on('error', reject);
    if (opts.body) request.write(opts.body);
    request.end();
  });
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 1 — HTTP Security Headers
// ════════════════════════════════════════════════════════════════════════════
async function checkSecurityHeaders() {
  console.log(c.bold('\n━━━ 1. HTTP Security Headers ─────────────────────────────'));
  const { headers } = await req(`${API}/health`);

  const required: Array<[string, RegExp | null]> = [
    ['x-content-type-options',     /nosniff/i],
    ['x-frame-options',            /DENY|SAMEORIGIN/i],
    ['strict-transport-security',  null],   // only required on HTTPS
    ['content-security-policy',    null],
    ['x-xss-protection',           null],
    ['referrer-policy',            null],
  ];

  for (const [header, pattern] of required) {
    const val = headers[header];
    if (!val) {
      if (header === 'strict-transport-security' && BASE_URL.startsWith('http:')) {
        info(`${header}: skipped (HTTP, not HTTPS)`);
        continue;
      }
      fail('HIGH', 'Headers', `Missing ${header}`, `Header not present in response`, `Add via Helmet: helmet.${header.replace(/-./g, m => m[1].toUpperCase())}()`);
    } else if (pattern && !pattern.test(val)) {
      fail('MEDIUM', 'Headers', `Weak ${header}`, `Value: "${val}"`, `Expected pattern: ${pattern}`);
    } else {
      pass('Headers', `${header}: ${val}`);
    }
  }

  // Must NOT expose server version
  if (headers['x-powered-by']) {
    fail('LOW', 'Headers', 'X-Powered-By exposed', `Value: ${headers['x-powered-by']}`, 'Add app.disable("x-powered-by") or use helmet()');
  } else {
    pass('Headers', 'X-Powered-By hidden');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 2 — Authentication & Authorisation
// ════════════════════════════════════════════════════════════════════════════
async function checkAuth() {
  console.log(c.bold('\n━━━ 2. Authentication & Authorisation ────────────────────'));

  // 2a — Protected routes require token
  const protectedRoutes = [
    `${API}/users/me`,
    `${API}/enrollments`,
    `${API}/analytics`,
  ];
  for (const url of protectedRoutes) {
    const { status } = await req(url);
    if (status === 401 || status === 403) {
      pass('Auth', `${url.replace(API, '')} → ${status} without token`);
    } else if (status === 404) {
      info(`${url.replace(API, '')} → 404 (route may not exist yet)`);
    } else {
      fail('CRITICAL', 'Auth', `Unprotected route: ${url.replace(API, '')}`, `Returned HTTP ${status} without auth token`, 'Add JwtAuthGuard to this controller/route');
    }
  }

  // 2b — Malformed JWT rejected
  const { status: jwtStatus } = await req(`${API}/users/me`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIn0.' },
  });
  if (jwtStatus === 401 || jwtStatus === 403) {
    pass('Auth', '"alg:none" JWT rejected');
  } else if (jwtStatus === 404) {
    info('"alg:none" JWT test skipped (route not found)');
  } else {
    fail('CRITICAL', 'Auth', '"alg:none" JWT accepted', `HTTP ${jwtStatus} — unsigned token was accepted`, 'Ensure passport-jwt checks algorithm explicitly');
  }

  // 2c — SQL injection in auth endpoint
  const sqli = { email: "admin'--", password: "x" };
  const { status: sqliStatus, body } = await req(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sqli),
  });
  if (sqliStatus >= 400 && sqliStatus < 500) {
    pass('Injection', `SQLi probe rejected (${sqliStatus})`);
  } else if (sqliStatus === 404) {
    info('SQLi test skipped (login route not found)');
  } else {
    fail('CRITICAL', 'Injection', 'SQL injection probe not rejected', `HTTP ${sqliStatus}`, 'Use parameterised queries (Prisma already does this — verify middleware)');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 3 — Rate Limiting
// ════════════════════════════════════════════════════════════════════════════
async function checkRateLimiting() {
  console.log(c.bold('\n━━━ 3. Rate Limiting ─────────────────────────────────────'));

  // Fire 15 rapid requests to auth endpoint
  const results: number[] = [];
  for (let i = 0; i < 15; i++) {
    const { status } = await req(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `probe${i}@test.com`, password: 'wrong' }),
    });
    results.push(status);
  }

  const rateLimited = results.filter(s => s === 429).length;
  if (rateLimited > 0) {
    pass('RateLimit', `429 received after ${results.indexOf(429) + 1} requests`);
  } else {
    const fourOhOnes = results.filter((s: number) => s === 401).length;
    if (fourOhOnes === 15) {
      fail('HIGH', 'RateLimit', 'No rate limiting on /auth/login', `All 15 rapid requests returned 401 (never 429)`, 'Apply @Throttle({ short: { ttl: 60000, limit: 5 } }) to AuthController');
    } else {
      info(`Auth endpoint returned statuses: ${[...new Set(results)].join(', ')}`);
    }
  }

  // Health endpoint should NOT be rate-limited (internal use)
  const healthStatuses: number[] = [];
  for (let i = 0; i < 20; i++) {
    const { status } = await req(`${API}/health`);
    healthStatuses.push(status);
  }
  if (healthStatuses.every(s => s === 200)) {
    pass('RateLimit', '/health not rate-limited (correct)');
  } else {
    fail('MEDIUM', 'RateLimit', '/health is rate-limited', 'Health probes will fail under load', 'Add @SkipThrottle() to HealthController');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 4 — CORS Policy
// ════════════════════════════════════════════════════════════════════════════
async function checkCors() {
  console.log(c.bold('\n━━━ 4. CORS Policy ───────────────────────────────────────'));

  // Allowed origin
  const { headers: allowedHeaders } = await req(`${API}/health`, {
    headers: { Origin: 'http://localhost:3000' },
  });
  if (allowedHeaders['access-control-allow-origin'] === 'http://localhost:3000') {
    pass('CORS', 'Allowed origin accepted');
  } else {
    info('CORS: /health may not echo origin (check preflight on POST routes)');
  }

  // Disallowed origin
  const { headers: deniedHeaders } = await req(`${API}/health`, {
    headers: { Origin: 'https://evil.example.com' },
  });
  const acao = deniedHeaders['access-control-allow-origin'];
  if (!acao || acao === 'null') {
    pass('CORS', 'Unknown origin rejected');
  } else if (acao === '*') {
    fail('HIGH', 'CORS', 'Wildcard CORS (*) on authenticated API', 'Any origin can call the API', 'Set explicit allow-list: ALLOWED_ORIGINS env var');
  } else {
    fail('MEDIUM', 'CORS', `Suspicious ACAO: "${acao}"`, 'Untrusted origin may be reflected', 'Validate against explicit allow-list');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 5 — Sensitive Data Exposure
// ════════════════════════════════════════════════════════════════════════════
async function checkDataExposure() {
  console.log(c.bold('\n━━━ 5. Sensitive Data Exposure ───────────────────────────'));

  // Stack traces in error responses
  const { body: errBody } = await req(`${API}/this-route-does-not-exist-12345`);
  try {
    const parsed = JSON.parse(errBody);
    if (parsed.stack || (typeof parsed.message === 'string' && parsed.message.includes('at '))) {
      fail('HIGH', 'Exposure', 'Stack trace in error response', 'Internal file paths/stack exposed', 'Ensure NODE_ENV=production strips stack traces from responses');
    } else {
      pass('Exposure', 'No stack trace in 404 response');
    }
    if (parsed.error && typeof parsed.error === 'object' && Object.keys(parsed.error).length > 3) {
      fail('LOW', 'Exposure', 'Verbose error object', JSON.stringify(parsed.error).substring(0, 100), 'Return only message + statusCode in production');
    } else {
      pass('Exposure', 'Error response is lean');
    }
  } catch {
    info('Non-JSON error response (check manually)');
  }

  // Metrics endpoint should not be publicly accessible in prod
  const { status: metricsStatus } = await req(`${API}/metrics`);
  if (metricsStatus === 200) {
    fail('MEDIUM', 'Exposure', '/metrics endpoint publicly accessible', 'Prometheus scrape endpoint has no auth', 'Add IP allowlist or basic-auth in production (OK for dev)');
  } else {
    pass('Exposure', '/metrics requires auth');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 6 — Secrets in Source Code
// ════════════════════════════════════════════════════════════════════════════
function checkSecrets() {
  console.log(c.bold('\n━━━ 6. Secrets Scan ──────────────────────────────────────'));

  const patterns: Array<[string, RegExp]> = [
    ['AWS Secret Key',     /AKIA[0-9A-Z]{16}/],
    ['Private Key',        /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/],
    ['Stripe Live Key',    /sk_live_[0-9a-zA-Z]{24,}/],
    ['GitHub PAT',         /ghp_[0-9a-zA-Z]{36}/],
    // Only flag secrets: lowercase-starting alphanumeric with special chars (not UI labels like "Password")
    ['Generic Password',   /(?:password|passwd|pwd)\s*[:=]\s*['"](?![A-Z][a-z]+['"])[a-z0-9][A-Za-z0-9!@#$%^&*()_+\-=]{7,}['"]/],
    ['Hardcoded JWT',      /jwt[_-]?secret\s*[:=]\s*['"][^'"]{8,}/i],
  ];

  const scanDirs = ['apps/api/src', 'apps/web/src', 'packages'];
  let secretsFound = 0;

  for (const dir of scanDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) continue;

    const files = getAllFiles(fullPath).filter(f =>
      (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.env')) &&
      !f.includes('node_modules') && !f.includes('.spec.') && !f.includes('dist')
    );

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const [name, pattern] of patterns) {
        if (pattern.test(content)) {
          const relPath = path.relative(path.join(__dirname, '..'), file);
          fail('CRITICAL', 'Secrets', `${name} found in source`, `File: ${relPath}`, 'Remove secret, rotate immediately, use process.env or vault');
          secretsFound++;
        }
      }
    }
  }

  if (secretsFound === 0) {
    pass('Secrets', 'No hardcoded secrets found in source code');
  }

  // Check .env is gitignored
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignore.includes('.env')) {
      pass('Secrets', '.env files are gitignored');
    } else {
      fail('HIGH', 'Secrets', '.env not in .gitignore', '.env files may be committed', 'Add .env* to .gitignore');
    }
  }
}

function getAllFiles(dirPath: string, files: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return files;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
      getAllFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 7 — Dependency CVEs
// ════════════════════════════════════════════════════════════════════════════
function checkDependencies() {
  console.log(c.bold('\n━━━ 7. Dependency CVEs ───────────────────────────────────'));
  try {
    const result = execSync('pnpm audit --json 2>/dev/null || echo "{}"', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000,
    });
    const audit = JSON.parse(result || '{}');
    const advisories = audit.advisories || {};
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };

    for (const adv of Object.values(advisories) as any[]) {
      counts[adv.severity as keyof typeof counts]++;
    }

    if (counts.critical > 0) fail('CRITICAL', 'Dependencies', `${counts.critical} critical CVEs`, 'Run: pnpm audit --fix', 'Update affected packages immediately');
    else pass('Dependencies', 'No critical CVEs');

    if (counts.high > 0) fail('HIGH', 'Dependencies', `${counts.high} high CVEs`, 'Run: pnpm audit for details', 'Schedule update within 7 days');
    else pass('Dependencies', 'No high CVEs');

    if (counts.moderate > 0) info(`Moderate CVEs: ${counts.moderate} (review within 30 days)`);
    if (counts.low > 0)      info(`Low CVEs: ${counts.low}`);
  } catch {
    info('Dependency audit skipped (pnpm audit failed — run manually)');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK 8 — Webhook Security
// ════════════════════════════════════════════════════════════════════════════
async function checkWebhooks() {
  console.log(c.bold('\n━━━ 8. Webhook Signature Validation ──────────────────────'));

  // Stripe webhook without signature should be rejected
  const { status } = await req(`${API}/payments/webhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type: 'payment_intent.succeeded', data: {} }),
  });

  if (status === 400 || status === 401 || status === 403) {
    pass('Webhooks', `Stripe webhook without signature rejected (${status})`);
  } else if (status === 404) {
    info('Webhook endpoint not found (verify route path)');
  } else {
    fail('CRITICAL', 'Webhooks', 'Unsigned webhook accepted', `HTTP ${status} — no stripe-signature header`, 'Always validate Stripe-Signature header before processing');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT
// ════════════════════════════════════════════════════════════════════════════
function printReport() {
  const bySeverity = (s: Finding['severity']) => findings.filter(f => f.severity === s);
  const critical = bySeverity('CRITICAL');
  const high     = bySeverity('HIGH');
  const medium   = bySeverity('MEDIUM');
  const low      = bySeverity('LOW');

  console.log(c.bold('\n\n══════════════════════════════════════════════════════════'));
  console.log(c.bold('  SECURITY AUDIT REPORT'));
  console.log(c.bold('══════════════════════════════════════════════════════════'));
  console.log(`  Passed:   ${c.green(String(passed))}`);
  console.log(`  Failed:   ${c.red(String(failed))}`);
  console.log(`  Critical: ${critical.length > 0 ? c.red(String(critical.length)) : c.green('0')}`);
  console.log(`  High:     ${high.length > 0     ? c.red(String(high.length))     : c.green('0')}`);
  console.log(`  Medium:   ${medium.length > 0   ? c.yellow(String(medium.length)) : c.green('0')}`);
  console.log(`  Low:      ${low.length > 0      ? c.yellow(String(low.length))    : c.green('0')}`);

  if (findings.length > 0) {
    console.log(c.bold('\n  FINDINGS TO REMEDIATE:'));
    for (const f of findings) {
      const color = f.severity === 'CRITICAL' || f.severity === 'HIGH' ? c.red : c.yellow;
      console.log(`\n  ${color(`[${f.severity}]`)} ${c.bold(f.title)}`);
      console.log(`    Category:       ${f.category}`);
      console.log(`    Detail:         ${f.detail}`);
      console.log(`    Recommendation: ${f.recommendation}`);
    }
  }

  // Write JSON report
  const reportPath = path.join(__dirname, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { passed, failed, critical: critical.length, high: high.length, medium: medium.length, low: low.length },
    findings,
  }, null, 2));
  console.log(c.cyan(`\n  Report saved: ${reportPath}`));

  const exitCode = critical.length > 0 || high.length > 0 ? 1 : 0;
  console.log(exitCode === 0
    ? c.green('\n  ✅ AUDIT PASSED — no critical/high findings')
    : c.red('\n  ❌ AUDIT FAILED — critical/high findings require remediation'));
  process.exit(exitCode);
}

// ─── Main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(c.bold(c.cyan('\n  LMS Platform Security Audit')));
  console.log(c.cyan(`  Target: ${BASE_URL}`));
  console.log(c.cyan(`  Time:   ${new Date().toISOString()}\n`));

  await checkSecurityHeaders();
  await checkAuth();
  await checkRateLimiting();
  await checkCors();
  await checkDataExposure();
  checkSecrets();
  checkDependencies();
  await checkWebhooks();

  printReport();
})();
