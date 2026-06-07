/**
 * Circuit Breaker
 * Prevents cascading failures when a dependency goes down.
 *
 * States:
 *   CLOSED   → normal operation; failures counted
 *   OPEN     → dependency down; calls rejected immediately (no timeout waste)
 *   HALF-OPEN → trial period; one call allowed through to test recovery
 *
 * Usage:
 *   const cb = new CircuitBreaker('stripe', { failureThreshold: 5, timeout: 30_000 });
 *   const result = await cb.execute(() => stripe.charges.create(...), fallback);
 */
import { Logger } from '@nestjs/common';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;   // failures before opening  (default 5)
  successThreshold: number;   // successes in HALF_OPEN to close (default 2)
  timeout:          number;   // ms to stay OPEN before HALF_OPEN (default 30_000)
  requestTimeout?:  number;   // ms before a single call is considered failed
}

export class CircuitBreaker {
  private state:          CircuitState = 'CLOSED';
  private failureCount    = 0;
  private successCount    = 0;
  private lastFailureTime = 0;
  private readonly logger: Logger;

  private readonly threshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly requestTimeout: number;

  constructor(private readonly name: string, opts: Partial<CircuitBreakerOptions> = {}) {
    this.threshold        = opts.failureThreshold  ?? 5;
    this.successThreshold = opts.successThreshold  ?? 2;
    this.timeout          = opts.timeout           ?? 30_000;
    this.requestTimeout   = opts.requestTimeout    ?? 10_000;
    this.logger           = new Logger(`CircuitBreaker[${name}]`);
  }

  get isOpen()     { return this.state === 'OPEN'; }
  get isClosed()   { return this.state === 'CLOSED'; }
  get isHalfOpen() { return this.state === 'HALF_OPEN'; }
  get status()     { return { name: this.name, state: this.state, failureCount: this.failureCount }; }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.logger.log(`→ HALF_OPEN (trying recovery)`);
        this.state = 'HALF_OPEN';
      } else {
        this.logger.warn(`OPEN — rejecting call, using fallback`);
        if (fallback) return fallback();
        throw new ServiceUnavailableError(`${this.name} is unavailable (circuit open)`);
      }
    }

    try {
      const result = await this.withTimeout(fn(), this.requestTimeout);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallback) {
        this.logger.warn(`Call failed — using fallback. Error: ${err.message}`);
        return fallback();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state        = 'CLOSED';
        this.successCount = 0;
        this.logger.log(`→ CLOSED (recovered after ${this.successCount} successes)`);
      }
    }
  }

  private onFailure(err: Error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount    = 0;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.logger.error(`→ OPEN after ${this.failureCount} failures. Last: ${err.message}`);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${this.name} timed out after ${ms}ms`)), ms)
      ),
    ]);
  }

  // Manual controls for health-check-driven overrides
  forceOpen()   { this.state = 'OPEN';     this.lastFailureTime = Date.now(); }
  forceClose()  { this.state = 'CLOSED';   this.failureCount = 0; }
}

export class ServiceUnavailableError extends Error {
  readonly statusCode = 503;
  constructor(msg: string) { super(msg); this.name = 'ServiceUnavailableError'; }
}
