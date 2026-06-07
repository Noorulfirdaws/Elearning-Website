import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LearningPathsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: {
    title: string;
    description?: string;
    thumbnail?: string;
    isPublic?: boolean;
    tenantId?: string;
  }) {
    return this.prisma.learningPath.create({
      data: {
        id: uuidv4(),
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        thumbnail: dto.thumbnail,
        isPublic: dto.isPublic ?? false,
        tenantId: dto.tenantId,
        estimatedDuration: 0,
        order: 0,
      },
    });
  }

  async addStep(pathId: string, userId: string, dto: {
    courseId?: string;
    quizId?: string;
    type: 'COURSE' | 'QUIZ' | 'ASSESSMENT' | 'EXTERNAL' | 'CHECKPOINT';
    title: string;
    description?: string;
    isRequired?: boolean;
    unlockAfterStepId?: string;
    externalUrl?: string;
    dueInDays?: number;
  }) {
    const path = await this.prisma.learningPath.findUnique({ where: { id: pathId } });
    if (!path) throw new NotFoundException('Learning path not found');
    if (path.createdBy !== userId) throw new ForbiddenException();

    const stepCount = await this.prisma.learningPathStep.count({ where: { pathId } });

    return this.prisma.learningPathStep.create({
      data: {
        pathId,
        courseId: dto.courseId,
        type: dto.type as any,
        title: dto.title,
        description: dto.description,
        order: stepCount + 1,
        isRequired: dto.isRequired ?? true,
        unlockAfterStepId: dto.unlockAfterStepId,
        externalUrl: dto.externalUrl,
        dueInDays: dto.dueInDays,
      },
    });
  }

  async findById(id: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: { course: { select: { id: true, title: true, slug: true, thumbnail: true, totalDuration: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    return path;
  }

  async list(tenantId?: string, isPublic = true) {
    return this.prisma.learningPath.findMany({
      where: { ...(tenantId ? { tenantId } : {}), ...(isPublic ? { isPublic: true } : {}) },
      include: {
        steps: { orderBy: { order: 'asc' }, take: 5 },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async enroll(pathId: string, userId: string) {
    return this.prisma.learningPathEnrollment.upsert({
      where: { pathId_userId: { pathId, userId } },
      create: { pathId, userId },
      update: {},
    });
  }

  async updateProgress(pathId: string, userId: string, stepId: string, completed: boolean) {
    const enrollment = await this.prisma.learningPathEnrollment.findUnique({
      where: { pathId_userId: { pathId, userId } },
    });
    if (!enrollment) throw new NotFoundException('Not enrolled in this learning path');

    await this.prisma.learningPathStepProgress.upsert({
      where: { enrollmentId_stepId: { enrollmentId: enrollment.id, stepId } },
      create: { enrollmentId: enrollment.id, stepId, completed, completedAt: completed ? new Date() : null },
      update: { completed, completedAt: completed ? new Date() : null },
    });

    // Check if path is fully completed
    const [totalRequired, completedCount] = await Promise.all([
      this.prisma.learningPathStep.count({ where: { pathId, isRequired: true } }),
      this.prisma.learningPathStepProgress.count({
        where: { enrollment: { pathId, userId }, completed: true, step: { isRequired: true } },
      }),
    ]);

    if (totalRequired > 0 && completedCount >= totalRequired) {
      await this.prisma.learningPathEnrollment.update({
        where: { pathId_userId: { pathId, userId } },
        data: { completedAt: new Date(), progress: 100 },
      });
    } else {
      const progress = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;
      await this.prisma.learningPathEnrollment.update({
        where: { pathId_userId: { pathId, userId } },
        data: { progress },
      });
    }
  }

  async getUserPaths(userId: string) {
    return this.prisma.learningPathEnrollment.findMany({
      where: { userId },
      include: {
        path: {
          include: {
            steps: { orderBy: { order: 'asc' }, include: { course: { select: { id: true, title: true, thumbnail: true } } } },
          },
        },
        stepProgress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reorderSteps(pathId: string, userId: string, stepIds: string[]) {
    const path = await this.prisma.learningPath.findUnique({ where: { id: pathId } });
    if (!path) throw new NotFoundException('Learning path not found');
    if (path.createdBy !== userId) throw new ForbiddenException();

    await Promise.all(
      stepIds.map((id, index) =>
        this.prisma.learningPathStep.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
  }
}
