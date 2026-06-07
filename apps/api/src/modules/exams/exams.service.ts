import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async getExam(id: string, includeAnswers = false) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true, text: true, type: true, points: true,
            options: includeAnswers,
            correctAnswer: includeAnswers,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async startAttempt(examId: string, userId: string) {
    const exam = await this.getExam(examId, false);
    const attempt = await this.prisma.examAttempt.create({
      data: { examId, userId, startedAt: new Date(), status: 'IN_PROGRESS' },
    });
    return { attempt, exam };
  }

  async submitAttempt(attemptId: string, userId: string, answers: Record<string, string>) {
    const attempt = await this.prisma.examAttempt.findFirst({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const exam = await this.getExam(attempt.examId, true);
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of exam.questions as any[]) {
      totalPoints += q.points;
      const answer = answers[q.id];
      if (answer && answer.toLowerCase() === q.correctAnswer?.toLowerCase()) {
        earnedPoints += q.points;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (exam.passingScore ?? 70);

    return this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: { answers, score, passed, status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async getMyAttempts(examId: string, userId: string) {
    return this.prisma.examAttempt.findMany({
      where: { examId, userId },
      orderBy: { startedAt: 'desc' },
    });
  }
}
