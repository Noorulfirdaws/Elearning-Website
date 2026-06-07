/**
 * LMS Security Audit Configuration
 * Defines all security checks, thresholds, and automated scanning targets.
 */
export const SECURITY_AUDIT_CONFIG = {
  // OWASP Top-10 checks to run
  owaspChecks: [
    'A01:2021-Broken-Access-Control',
    'A02:2021-Cryptographic-Failures',
    'A03:2021-Injection',
    'A04:2021-Insecure-Design',
    'A05:2021-Security-Misconfiguration',
    'A06:2021-Vulnerable-Components',
    'A07:2021-Identification-Authentication-Failures',
    'A08:2021-Software-Data-Integrity-Failures',
    'A09:2021-Security-Logging-Monitoring-Failures',
    'A10:2021-SSRF',
  ],
  // Severity thresholds that fail CI
  failOn: { critical: 0, high: 0, moderate: 5 },
  // Endpoints to probe in security tests
  endpoints: {
    public:  ['GET /api/v1/health', 'GET /api/v1/courses'],
    authed:  ['GET /api/v1/users/me', 'GET /api/v1/enrollments'],
    admin:   ['GET /api/v1/analytics', 'GET /api/v1/tenants'],
    webhook: ['POST /api/v1/payments/webhook'],
  },
};
