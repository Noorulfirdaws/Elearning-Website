import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService } from '../../config/prisma.service';

const mockCourse = {
  id: 'course-1',
  title: 'Test Course',
  slug: 'test-course',
  instructorId: 'instructor-1',
  status: 'DRAFT',
  price: 4999,
  isFree: false,
  rating: 0,
  reviewCount: 0,
  totalStudents: 0,
  createdAt: new Date(),
  deletedAt: null,
};

const mockPrisma = {
  course: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  enrollment: {
    findUnique: jest.fn(),
  },
};

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a course with a slug', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue(mockCourse);

      const result = await service.create('instructor-1', { title: 'Test Course', price: 4999 });
      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: expect.stringMatching(/^test-course/) }),
        }),
      );
      expect(result).toEqual(mockCourse);
    });
  });

  describe('findBySlug', () => {
    it('returns course with enrollment check', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ ...mockCourse, status: 'PUBLISHED', sections: [] });
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enroll-1' });

      const result = await service.findBySlug('test-course', 'student-1');
      expect(result).toHaveProperty('isEnrolled', true);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException for non-owner', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
      await expect(
        service.update('course-1', 'different-user', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates course for owner', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
      mockPrisma.course.update.mockResolvedValue({ ...mockCourse, title: 'Updated' });

      const result = await service.update('course-1', 'instructor-1', { title: 'Updated' });
      expect(mockPrisma.course.update).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('throws ForbiddenException for non-owner', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
      await expect(service.publish('course-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });
});
