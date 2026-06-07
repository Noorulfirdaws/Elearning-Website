import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  private async verifyInstructor(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return course;
  }

  async create(courseId: string, userId: string, title: string, description?: string) {
    await this.verifyInstructor(courseId, userId);
    const count = await this.prisma.section.count({ where: { courseId } });
    return this.prisma.section.create({
      data: { courseId, title, description, order: count + 1 },
    });
  }

  async findByCourse(courseId: string) {
    return this.prisma.section.findMany({
      where: { courseId },
      include: {
        lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async update(id: string, userId: string, data: { title?: string; description?: string }) {
    const section = await this.prisma.section.findUnique({ where: { id }, include: { course: true } });
    if (!section) throw new NotFoundException('Section not found');
    if (section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    return this.prisma.section.update({ where: { id }, data });
  }

  async reorder(courseId: string, userId: string, ids: string[]) {
    await this.verifyInstructor(courseId, userId);
    await Promise.all(
      ids.map((id, index) => this.prisma.section.update({ where: { id }, data: { order: index + 1 } })),
    );
  }

  async delete(id: string, userId: string) {
    const section = await this.prisma.section.findUnique({ where: { id }, include: { course: true } });
    if (!section) throw new NotFoundException('Section not found');
    if (section.course.instructorId !== userId) throw new ForbiddenException('Not your course');
    await this.prisma.section.delete({ where: { id } });
  }
}
