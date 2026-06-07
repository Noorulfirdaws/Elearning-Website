import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformOverview() {
    const [totalUsers, totalCourses, totalEnrollments, revenueResult] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.enrollment.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.COMPLETED }, _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalRevenue: revenueResult._sum.amount || 0,
    };
  }

  async getDailyMetrics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const metrics = await this.prisma.analyticsEvent.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    return metrics;
  }

  async getInstructorAnalytics(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId, deletedAt: null },
      select: { id: true, title: true, totalStudents: true, rating: true, totalRatings: true },
    });

    const courseIds = courses.map((c) => c.id);

    const revenue = await this.prisma.payment.aggregate({
      where: { courseId: { in: courseIds }, status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    });

    const completions = await this.prisma.enrollment.count({
      where: { courseId: { in: courseIds }, completedAt: { not: null } },
    });

    return {
      courses,
      totalRevenue: revenue._sum.amount || 0,
      totalStudents: courses.reduce((sum, c) => sum + c.totalStudents, 0),
      completions,
    };
  }

  async getCourseAnalytics(courseId: string) {
    const [enrollments, completions, avgProgress, revenueResult] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId, isActive: true } }),
      this.prisma.enrollment.count({ where: { courseId, completedAt: { not: null } } }),
      this.prisma.enrollment.aggregate({ where: { courseId }, _avg: { progress: true } }),
      this.prisma.payment.aggregate({ where: { courseId, status: PaymentStatus.COMPLETED }, _sum: { amount: true } }),
    ]);

    return {
      enrollments,
      completions,
      completionRate: enrollments > 0 ? (completions / enrollments) * 100 : 0,
      avgProgress: avgProgress._avg.progress || 0,
      revenue: revenueResult._sum.amount || 0,
    };
  }

  async trackEvent(userId: string | undefined, event: string, properties?: any) {
    return this.prisma.analyticsEvent.create({
      data: { userId, event, properties },
    });
  }
}
