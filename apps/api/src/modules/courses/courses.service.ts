import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseStatus, UserRole } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(instructorId: string, dto: CreateCourseDto) {
    const slug = await this.generateSlug(dto.title);
    return this.prisma.course.create({
      data: {
        ...dto,
        slug,
        instructorId,
      },
      include: { instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } }, category: true },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    level?: string;
    search?: string;
    status?: CourseStatus;
    instructorId?: string;
    isFree?: boolean;
    minPrice?: number;
    maxPrice?: number;
    language?: string;
    sortBy?: string;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 12, 50);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.status) where.status = query.status;
    else where.status = CourseStatus.PUBLISHED;

    if (query.instructorId) where.instructorId = query.instructorId;
    if (query.category) where.category = { slug: query.category };
    if (query.level) where.level = query.level;
    if (query.language) where.language = query.language;
    if (query.isFree !== undefined) where.isFree = query.isFree;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    const orderBy: any = {};
    switch (query.sortBy) {
      case 'rating': orderBy.rating = 'desc'; break;
      case 'students': orderBy.totalStudents = 'desc'; break;
      case 'price_asc': orderBy.price = 'asc'; break;
      case 'price_desc': orderBy.price = 'desc'; break;
      default: orderBy.publishedAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          category: true,
          _count: { select: { enrollments: true, sections: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string, userId?: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, deletedAt: null },
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true, avatar: true, bio: true },
        },
        category: true,
        sections: {
          where: { isPublished: true },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { position: 'asc' },
              select: {
                id: true, title: true, type: true, duration: true, isFreePreview: true, position: true,
              },
            },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { course: { select: { id: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    let isEnrolled = false;
    if (userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: course.id, isActive: true },
      });
      isEnrolled = !!enrollment;
    }

    return { ...course, isEnrolled };
  }

  async findById(id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        category: true,
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(id: string, userId: string, userRole: UserRole, dto: UpdateCourseDto) {
    const course = await this.findById(id);
    if (course.instructorId !== userId && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this course');
    }
    return this.prisma.course.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async publish(id: string, userId: string, userRole: UserRole) {
    const course = await this.findById(id);
    if (course.instructorId !== userId && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this course');
    }
    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async unpublish(id: string, userId: string, userRole: UserRole) {
    const course = await this.findById(id);
    if (course.instructorId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You do not own this course');
    }
    return this.prisma.course.update({ where: { id }, data: { status: CourseStatus.DRAFT } });
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const course = await this.findById(id);
    if (course.instructorId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You do not own this course');
    }
    return this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getInstructorCourses(instructorId: string) {
    return this.prisma.course.findMany({
      where: { instructorId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrollments: true } },
        category: true,
      },
    });
  }

  async getInstructorCourseById(id: string, userId: string, role: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(role === 'INSTRUCTOR' ? { instructorId: userId } : {}),
      },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: { lessons: { orderBy: { position: 'asc' } } },
        },
        category: true,
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async getFeatured() {
    return this.prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED, deletedAt: null },
      orderBy: [{ rating: 'desc' }, { totalStudents: 'desc' }],
      take: 8,
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        category: true,
        _count: { select: { enrollments: true } },
      },
    });
  }

  async addReview(courseId: string, userId: string, rating: number, comment?: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { courseId, userId, isActive: true },
    });
    if (!enrollment) throw new ForbiddenException('You must be enrolled to review this course');

    const review = await this.prisma.review.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, rating, comment },
      update: { rating, comment },
    });

    await this.recalculateRating(courseId);
    return review;
  }

  private async recalculateRating(courseId: string) {
    const result = await this.prisma.review.aggregate({
      where: { courseId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.course.update({
      where: { id: courseId },
      data: { rating: result._avg.rating || 0, totalRatings: result._count.rating },
    });
  }

  private async generateSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = base;
    let i = 1;
    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
