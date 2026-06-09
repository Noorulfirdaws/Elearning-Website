import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  // Skill taxonomy
  async createSkill(dto: { name: string; description?: string; parentId?: string; tenantId?: string }) {
    return this.prisma.skill.create({
      data: { id: uuidv4(), ...dto },
    });
  }

  async getSkillTree(tenantId?: string) {
    const skills = await this.prisma.skill.findMany({
      where: { ...(tenantId ? { tenantId } : {}), parentId: null },
      include: {
        children: {
          include: { children: true },
        },
      },
    });
    return skills;
  }

  // Skill assessment
  async createAssessment(dto: {
    title: string;
    skillId: string;
    questions: Array<{
      text: string;
      type: 'MCQ' | 'PRACTICAL' | 'ESSAY';
      options?: string[];
      correctAnswer?: string;
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
      points: number;
    }>;
  }) {
    return this.prisma.skillAssessment.create({
      data: {
        id: uuidv4(),
        title: dto.title,
        skillId: dto.skillId,
        questions: {
          create: dto.questions.map((q, i) => ({
            text: q.text,
            type: q.type as any,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty as any,
            points: q.points,
            order: i + 1,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async startAssessment(assessmentId: string, userId: string) {
    const assessment = await this.prisma.skillAssessment.findUnique({
      where: { id: assessmentId },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const attempt = await this.prisma.skillAssessmentAttempt.create({
      data: { assessmentId, userId, startedAt: new Date() },
    });

    // Return questions without answers
    const questions = assessment.questions.map(q => ({
      id: q.id, text: q.text, type: q.type, options: q.options,
      difficulty: q.difficulty, points: q.points,
    }));

    return { attemptId: attempt.id, questions };
  }

  async submitAssessment(attemptId: string, userId: string, answers: Record<string, string>) {
    const attempt = await this.prisma.skillAssessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: { include: { questions: true, skill: true } } },
    });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    let totalPoints = 0;
    let earnedPoints = 0;
    const breakdown: Record<string, { correct: boolean; points: number; difficulty: string }> = {};

    for (const q of attempt.assessment.questions) {
      totalPoints += q.points;
      const answer = answers[q.id];
      const correct = answer === q.correctAnswer;
      if (correct) earnedPoints += q.points;
      breakdown[q.id] = { correct, points: correct ? q.points : 0, difficulty: q.difficulty };
    }

    const score = Math.round((earnedPoints / totalPoints) * 100);
    const proficiencyLevel = this.calculateProficiency(score, attempt.assessment.questions, answers);

    const result = await this.prisma.skillAssessmentAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        proficiencyLevel: proficiencyLevel as any,
        completedAt: new Date(),
        answers: answers as any,
        breakdown: breakdown as any,
      },
    });

    // Update user skill level
    await this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: attempt.assessment.skillId } },
      create: {
        userId,
        skillId: attempt.assessment.skillId,
        level: proficiencyLevel as any,
        score,
        assessedAt: new Date(),
      },
      update: {
        level: proficiencyLevel as any,
        score,
        assessedAt: new Date(),
      },
    });

    return { score, proficiencyLevel, breakdown, skillName: attempt.assessment.skill.name };
  }

  private calculateProficiency(score: number, questions: any[], answers: Record<string, string>): string {
    if (score >= 90) return 'EXPERT';
    if (score >= 75) return 'ADVANCED';
    if (score >= 55) return 'INTERMEDIATE';
    return 'BEGINNER';
  }

  async getUserSkillProfile(userId: string) {
    const skills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: { include: { parent: true } } },
    });

    const profile = skills.map(s => ({
      skill: s.skill.name,
      category: s.skill.parent?.name,
      level: s.level,
      score: s.score,
      assessedAt: s.assessedAt,
    }));

    // Generate skill gap analysis
    const gaps = await this.analyzeSkillGaps(userId, skills);

    return { skills: profile, gaps };
  }

  private async analyzeSkillGaps(userId: string, userSkills: any[]) {
    const userSkillIds = new Set(userSkills.map(s => s.skillId));
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { course: { include: { requiredSkills: true } } },
    });

    const gaps: Array<{ skill: string; requiredFor: string; currentLevel?: string }> = [];
    for (const enrollment of enrollments) {
      for (const skill of enrollment.course.requiredSkills || []) {
        if (!userSkillIds.has(skill.id)) {
          gaps.push({ skill: skill.name, requiredFor: enrollment.course.title });
        }
      }
    }
    return gaps;
  }

  async getSkillRecommendations(userId: string) {
    const profile = await this.getUserSkillProfile(userId);
    const weakSkills = profile.skills.filter(s => ['BEGINNER', 'INTERMEDIATE'].includes(s.level));

    const recommendations = await this.prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        skills: { some: { name: { in: weakSkills.map(s => s.skill) } } },
      },
      take: 10,
      select: { id: true, title: true, slug: true, thumbnail: true, level: true, rating: true },
    });

    return { recommendations, gaps: profile.gaps };
  }
}
