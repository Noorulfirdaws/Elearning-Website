import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async getAssignment(id: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id }, include: { lesson: { select: { title: true } } } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async submitAssignment(assignmentId: string, userId: string, data: { content?: string; fileUrl?: string }) {
    const existing = await this.prisma.assignmentSubmission.findFirst({ where: { assignmentId, userId } });
    if (existing) {
      return this.prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: { content: data.content, fileUrl: data.fileUrl, status: 'SUBMITTED', submittedAt: new Date() },
      });
    }
    return this.prisma.assignmentSubmission.create({
      data: { assignmentId, userId, content: data.content, fileUrl: data.fileUrl, status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  async getMySubmission(assignmentId: string, userId: string) {
    return this.prisma.assignmentSubmission.findFirst({ where: { assignmentId, userId } });
  }

  async gradeSubmission(submissionId: string, grade: number, feedback: string, graderId: string) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade, feedback, status: 'GRADED', gradedBy: graderId, gradedAt: new Date() },
    });
  }

  async getSubmissionsForAssignment(assignmentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { user: { select: { firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
