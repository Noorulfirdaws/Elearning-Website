import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
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

  // Apply global rate-limit guard (ThrottlerModule configured in AppModule)
  const { HttpAdapterHost } = await import('@nestjs/core');
  app.useGlobalGuards(new ThrottlerGuard({} as any, {} as any, new Reflector()));

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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  Logger.log(`LMS API running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
