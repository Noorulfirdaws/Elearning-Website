import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Global safety nets — never let an unhandled async error kill the process silently
process.on('unhandledRejection', (reason: any) => {
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED REJECTION]', reason?.message || reason, reason?.stack || '');
});
process.on('uncaughtException', (err: Error) => {
  // eslint-disable-next-line no-console
  console.error('[UNCAUGHT EXCEPTION]', err?.message, err?.stack);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const apiPrefix = 'api/v1';

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.setGlobalPrefix(apiPrefix);

  // CORS — strict allow-list
  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') || configService.get<string>('FRONTEND_URL', 'http://localhost:3000')).split(',');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'stripe-signature', 'x-api-key'],
  });

  // ThrottlerGuard is applied per-controller via @UseGuards(ThrottlerGuard) where needed.

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LMS Platform API')
    .setDescription('Production-grade Learning Management System REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('courses', 'Course management')
    .addTag('lessons', 'Lesson management')
    .addTag('quizzes', 'Quiz system')
    .addTag('exams', 'Exam system')
    .addTag('assignments', 'Assignment system')
    .addTag('certificates', 'Certificate system')
    .addTag('payments', 'Payment processing')
    .addTag('enrollments', 'Enrollment management')
    .addTag('community', 'Community platform')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('affiliates', 'Affiliate system')
    .addTag('notifications', 'Notification system')
    .addTag('search', 'Global search')
    .addTag('ai', 'AI features')
    .addTag('files', 'File management')
    .addTag('admin', 'Admin operations')
    .build();

  // Swagger uniquement hors production (ne pas exposer le schéma API publiquement)
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`LMS API running on http://0.0.0.0:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger docs at http://0.0.0.0:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
