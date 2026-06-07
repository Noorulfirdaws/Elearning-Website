import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async enrollFree(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, isFree: true, deletedAt: null } });
    if (!course) throw new NotFoundException('Free course not found');

    const existing = await this.prisma.enrollment.findFirst({ where: { userId, courseId } });
    if (existing?.isActive) throw new ConflictException('Already enrolled');

    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, isActive: true },
      update: { isActive: true },
    });
  }

  async getUserEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId, isActive: true },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnail: true, instructor: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async isEnrolled(userId: string, courseId: string) {
    const e = await this.prisma.enrollment.findFirst({ where: { userId, courseId, isActive: true } });
    return { isEnrolled: !!e, enrollment: e };
  }

  async getEnrolledStudents(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, instructorId } });
    if (!course) throw new ForbiddenException('Access denied');

    return this.prisma.enrollment.findMany({
      where: { courseId, isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { enrolledAt: 'desc' },
    });
  }
}
