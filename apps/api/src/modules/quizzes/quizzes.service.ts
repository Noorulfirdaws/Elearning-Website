import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async create(lessonId: string, userId: string, dto: {
    title: string; passingScore: number; timeLimit?: number; maxAttempts?: number;
    questions: Array<{
      text: string; type: string; options?: string[]; correctAnswer?: string;
      correctAnswers?: string[]; explanation?: string; points?: number; order: number;
    }>;
  }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.section.course.instructorId !== userId) throw new ForbiddenException('Not your course');

    return this.prisma.quiz.create({
      data: {
        lessonId,
        title: dto.title,
        passingScore: dto.passingScore,
        timeLimit: dto.timeLimit,
        maxAttempts: dto.maxAttempts || 3,
        questions: {
          create: dto.questions.map(q => ({
            text: q.text,
            type: q.type as any,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            correctAnswers: q.correctAnswers || [],
            explanation: q.explanation,
            points: q.points || 1,
            order: q.order,
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async findByLesson(lessonId: string) {
    return this.prisma.quiz.findFirst({
      where: { lessonId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async startAttempt(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const attempts = await this.prisma.quizAttempt.count({
      where: { quizId, userId, status: 'PASSED' },
    });
    if (quiz.maxAttempts && attempts >= quiz.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached');
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: { quizId, userId, startedAt: new Date() },
    });

    // Return questions without correct answers
    const questions = quiz.questions.map(q => ({
      id: q.id, text: q.text, type: q.type,
      options: q.options, points: q.points, order: q.order,
    }));

    return { attempt, questions, timeLimit: quiz.timeLimit };
  }

  async submitAttempt(attemptId: string, userId: string, answers: Record<string, string | string[]>) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of attempt.quiz.questions) {
      totalPoints += question.points;
      const answer = answers[question.id];

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        if (answer === question.correctAnswer) earnedPoints += question.points;
      } else if (question.type === 'MULTI_SELECT') {
        const correct = new Set(question.correctAnswers);
        const given = new Set(Array.isArray(answer) ? answer : [answer]);
        if (correct.size === given.size && [...correct].every(v => given.has(v))) {
          earnedPoints += question.points;
        }
      } else if (question.type === 'FILL_BLANK') {
        if (typeof answer === 'string' &&
          answer.trim().toLowerCase() === question.correctAnswer?.toLowerCase()) {
          earnedPoints += question.points;
        }
      }
    }

    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= attempt.quiz.passingScore;

    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as any,
        score,
        passed,
        status: passed ? 'PASSED' : 'FAILED',
        completedAt: new Date(),
      },
    });
  }

  async getUserAttempts(quizId: string, userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { startedAt: 'desc' },
    });
  }
}
