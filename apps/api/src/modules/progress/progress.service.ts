import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async updateLessonProgress(userId: string, lessonId: string, data: {
    watchPercentage?: number;
    timeWatched?: number;
    lastPosition?: number;
    isCompleted?: boolean;
  }) {
    const enrollment = await this.verifyEnrollment(userId, lessonId);

    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, ...data, completedAt: data.isCompleted ? new Date() : undefined },
      update: { ...data, completedAt: data.isCompleted ? new Date() : undefined },
    });

    await this.updateCourseProgress(userId, enrollment.courseId);
    return progress;
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId, isActive: true },
      include: {
        course: {
          include: {
            sections: {
              include: {
                lessons: {
                  select: { id: true, title: true, type: true, duration: true },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) throw new ForbiddenException('Not enrolled');

    const lessonIds = enrollment.course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const progressRecords = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    return {
      enrollment,
      progress: lessonIds.map((id) => ({ lessonId: id, ...progressMap.get(id) })),
      completedCount: progressRecords.filter((p) => p.isCompleted).length,
      totalCount: lessonIds.length,
    };
  }

  async getLessonProgress(userId: string, lessonId: string) {
    return this.prisma.lessonProgress.findFirst({ where: { userId, lessonId } });
  }

  private async updateCourseProgress(userId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: { section: { courseId }, isPublished: true },
    });

    if (totalLessons === 0) return;

    const lessonIds = await this.prisma.lesson.findMany({
      where: { section: { courseId }, isPublished: true },
      select: { id: true },
    });

    const completedCount = await this.prisma.lessonProgress.count({
      where: { userId, lessonId: { in: lessonIds.map((l) => l.id) }, isCompleted: true },
    });

    const progress = (completedCount / totalLessons) * 100;
    const isCompleted = progress >= 100;

    await this.prisma.enrollment.updateMany({
      where: { userId, courseId },
      data: {
        progress,
        completedAt: isCompleted ? new Date() : null,
        lastAccessAt: new Date(),
      },
    });
  }

  private async verifyEnrollment(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: lesson!.section.courseId, isActive: true },
    });

    if (!enrollment) throw new ForbiddenException('Not enrolled in this course');
    return { courseId: lesson!.section.courseId };
  }
}
