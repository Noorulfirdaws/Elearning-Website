/**
 * HTTP metrics interceptor — wraps every request with Prometheus instrumentation.
 * Apply globally in AppModule providers.
 */
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request  = ctx.switchToHttp().getRequest();
    const res: Response = ctx.switchToHttp().getResponse();

    // Normalise route: /courses/abc-123 → /courses/:slug
    const route = this.normaliseRoute(req.route?.path || req.path);
    const method = req.method;
    const startHr = process.hrtime.bigint();

    this.metrics.httpActiveRequests.inc();
    if (req.headers['content-length']) {
      this.metrics.httpRequestSize.observe(
        { method, route },
        parseInt(req.headers['content-length'] as string, 10),
      );
    }

    const finish = (statusCode: number) => {
      const durationSec = Number(process.hrtime.bigint() - startHr) / 1e9;
      const labels = { method, route, status_code: String(statusCode) };
      this.metrics.httpRequestsTotal.inc(labels);
      this.metrics.httpRequestDuration.observe(labels, durationSec);
      this.metrics.httpActiveRequests.dec();
    };

    return next.handle().pipe(
      tap(() => finish(res.statusCode || 200)),
      catchError((err) => {
        finish(err.status || 500);
        return throwError(() => err);
      }),
    );
  }

  private normaliseRoute(path: string): string {
    // Replace UUIDs and common slugs with param placeholder
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-z0-9-]{20,}/gi, '/:slug');
  }
}
