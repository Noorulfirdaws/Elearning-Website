/**
 * Quiz Grading Queue
 * Handles the 2,000 submissions/second burst gracefully:
 *  1. HTTP handler returns 202 Accepted immediately
 *  2. Grading job queued in Redis (Bull)
 *  3. Worker grades asynchronously, stores result
 *  4. Client polls GET /quizzes/attempt/:id for result
 *
 * Without queue: 2000 req/s → each hits DB 3–5 times = 10,000 DB ops/sec
 * With queue:    HTTP returns in <20ms, workers process at sustainable rate
 */
import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from '../../config/prisma.service';
import { CacheService, TTL } from '../../common/cache/cache.service';

export const GRADING_QUEUE      = 'quiz-grading';
export const GRADE_ATTEMPT_JOB  = 'grade-attempt';

export interface GradeAttemptPayload {
  attemptId: string;
  quizId:    string;
  userId:    string;
  answers:   Array<{ questionId: string; answer: string | string[] }>;
}

@Injectable()
export class QuizGradingProducer {
  constructor(
    @InjectQueue(GRADING_QUEUE) private queue: Queue,
    private cache: CacheService,
  ) {}

  async enqueueGrading(payload: GradeAttemptPayload): Promise<{ queued: boolean }> {
    // Idempotency: reject duplicate submission for same attempt
    const isDuplicate = await this.cache.markSeen('quiz-submit', payload.attemptId, 3600);
    if (isDuplicate) {
      throw new ConflictException('Quiz already submitted — duplicate attempt');
    }

    await this.queue.add(GRADE_ATTEMPT_JOB, payload, {
      jobId:            `grade:${payload.attemptId}`,
      removeOnComplete: 500,
      removeOnFail:     100,
      attempts:         3,
      backoff:          { type: 'exponential', delay: 2000 },
      priority:         1, // High priority
    });

    return { queued: true };
  }
}

@Processor(GRADING_QUEUE)
export class QuizGradingProcessor {
  private readonly logger = new Logger(QuizGradingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private cache:  CacheService,
  ) {}

  @Process({ name: GRADE_ATTEMPT_JOB, concurrency: 10 }) // 10 parallel graders per pod
  async gradeAttempt(job: Job<GradeAttemptPayload>) {
    const { attemptId, quizId, userId, answers } = job.data;
    const startTime = Date.now();

    try {
      // Load quiz questions + correct answers
      const quiz = await this.prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true },
      });

      if (!quiz) {
        this.logger.warn(`Quiz ${quizId} not found for attempt ${attemptId}`);
        return;
      }

      // Grade: score each answer
      let totalPoints = 0;
      let earnedPoints = 0;
      const gradedAnswers: Array<{
        questionId: string;
        userAnswer: string | string[];
        correct: boolean;
        points: number;
        explanation?: string;
      }> = [];

      for (const question of quiz.questions) {
        const userAnswer = answers.find((a) => a.questionId === question.id);
        const points = question.points || 1;
        totalPoints += points;

        let correct = false;
        if (userAnswer) {
          if (Array.isArray(userAnswer.answer)) {
            // Multiple-choice — order-insensitive comparison
            const ua = [...(userAnswer.answer as string[])].sort();
            const ca = [...(question.correctAnswers || [])].sort();
            correct = JSON.stringify(ua) === JSON.stringify(ca);
          } else {
            correct = userAnswer.answer === question.correctAnswer;
          }
        }

        if (correct) earnedPoints += points;

        gradedAnswers.push({
          questionId:  question.id,
          userAnswer:  userAnswer?.answer || '',
          correct,
          points:      correct ? points : 0,
          explanation: question.explanation || undefined,
        });
      }

      const score   = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const passed  = score >= quiz.passingScore;

      // Persist graded attempt
      const updatedAttempt = await this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data:  {
          score,
          passed,
          answers:     gradedAnswers as any,
          completedAt: new Date(),
          timeTaken:   Math.floor((Date.now() - startTime) / 1000),
        },
      });

      // Cache result so polling is fast
      await this.cache.set(
        CacheService.keys.quizResult(attemptId),
        updatedAttempt,
        TTL.QUIZ_RESULT,
      );

      this.logger.log(`Graded attempt ${attemptId}: score=${score.toFixed(1)}% passed=${passed} in ${Date.now() - startTime}ms`);

    } catch (err) {
      this.logger.error(`Grading failed for ${attemptId}: ${err.message}`);
      throw err;
    }
  }
}
