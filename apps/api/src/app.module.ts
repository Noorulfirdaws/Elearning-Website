import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { SectionsModule } from './modules/sections/sections.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CommunityModule } from './modules/community/community.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FilesModule } from './modules/files/files.module';
import { VideoModule } from './modules/video/video.module';
import { AiModule } from './modules/ai/ai.module';
import { EducationModule } from './modules/education/education.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './modules/health/health.module';
import { ScormModule } from './modules/scorm/scorm.module';
import { XapiModule } from './modules/xapi/xapi.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SsoModule } from './modules/sso/sso.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { LearningPathsModule } from './modules/learning-paths/learning-paths.module';
import { SkillsModule } from './modules/skills/skills.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebinarModule } from './modules/webinar/webinar.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { BetaModule }        from './modules/beta/beta.module';
import { PrismaModule }      from './config/prisma.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    // Core modules
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    SectionsModule,
    QuizzesModule,
    ExamsModule,
    AssignmentsModule,
    CertificatesModule,
    PaymentsModule,
    EnrollmentsModule,
    ProgressModule,
    CommunityModule,
    NotificationsModule,
    AnalyticsModule,
    AffiliatesModule,
    MembershipsModule,
    OrganizationsModule,
    FilesModule,
    VideoModule,
    AiModule,
    EducationModule,
    SearchModule,
    HealthModule,
    // Enterprise modules
    ScormModule,
    XapiModule,
    TenantsModule,
    SsoModule,
    WebhooksModule,
    DeveloperModule,
    LearningPathsModule,
    SkillsModule,
    IntegrationsModule,
    WebinarModule,
    MarketplaceModule,
    BetaModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally via DI — respects @Throttle() and @SkipThrottle() decorators
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
