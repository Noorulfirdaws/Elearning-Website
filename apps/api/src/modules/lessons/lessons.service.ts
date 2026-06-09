import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { LessonType } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  private async verifyInstructor(sectionId: string, userId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return section;
  }

  async create(sectionId: string, userId: string, dto: {
    title: string;
    type: LessonType;
    description?: string;
    videoUrl?: string;
    videoPlaybackId?: string;
    duration?: number;
    content?: string;
    embedUrl?: string;
    isFree?: boolean;
  }) {
    await this.verifyInstructor(sectionId, userId);
    const count = await this.prisma.lesson.count({ where: { sectionId } });
    return this.prisma.lesson.create({
      data: { sectionId, ...dto, position: count + 1 },
    });
  }

  async findById(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async update(id: string, userId: string, data: Partial<{
    title: string; description: string; videoUrl: string; videoPlaybackId: string;
    duration: number; content: string; embedUrl: string; isFree: boolean;
  }>) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async reorder(sectionId: string, userId: string, ids: string[]) {
    await this.verifyInstructor(sectionId, userId);
    await Promise.all(
      ids.map((id, index) => this.prisma.lesson.update({ where: { id }, data: { position: index + 1 } })),
    );
  }

  async delete(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return this.prisma.lesson.update({ where: { id }, data: { isPublished: false } });
  }

  async addResource(lessonId: string, userId: string, resource: { name: string; url: string; type: string }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return this.prisma.lessonResource.create({ data: { lessonId, ...resource } });
  }
}
