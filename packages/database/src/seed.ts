import { PrismaClient, UserRole, CourseStatus, CourseLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'web-development' }, update: {}, create: { name: 'Web Development', slug: 'web-development', icon: '💻', color: '#3B82F6' } }),
    prisma.category.upsert({ where: { slug: 'data-science' }, update: {}, create: { name: 'Data Science', slug: 'data-science', icon: '📊', color: '#8B5CF6' } }),
    prisma.category.upsert({ where: { slug: 'design' }, update: {}, create: { name: 'Design', slug: 'design', icon: '🎨', color: '#EC4899' } }),
    prisma.category.upsert({ where: { slug: 'business' }, update: {}, create: { name: 'Business', slug: 'business', icon: '📈', color: '#F59E0B' } }),
    prisma.category.upsert({ where: { slug: 'mobile' }, update: {}, create: { name: 'Mobile Dev', slug: 'mobile', icon: '📱', color: '#10B981' } }),
  ]);

  // Admin
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.dev' },
    update: {},
    create: {
      email: 'admin@lms.dev',
      passwordHash: adminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  // Instructor
  const instrHash = await bcrypt.hash('Instructor@123', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@lms.dev' },
    update: {},
    create: {
      email: 'instructor@lms.dev',
      passwordHash: instrHash,
      firstName: 'Jane',
      lastName: 'Instructor',
      role: UserRole.INSTRUCTOR,
      bio: 'Senior software engineer with 10+ years experience. Passionate about teaching.',
      isEmailVerified: true,
    },
  });

  // Student
  const studentHash = await bcrypt.hash('Student@123', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@lms.dev' },
    update: {},
    create: {
      email: 'student@lms.dev',
      passwordHash: studentHash,
      firstName: 'John',
      lastName: 'Student',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    },
  });

  // Courses
  const course1 = await prisma.course.upsert({
    where: { slug: 'complete-react-course-2024' },
    update: {},
    create: {
      title: 'The Complete React Course 2024',
      slug: 'complete-react-course-2024',
      description: 'Master React from beginner to advanced. Hooks, context, Redux, TypeScript, Next.js and more.',
      shortDescription: 'Learn React from scratch to advanced with 40+ hours of content.',
      instructorId: instructor.id,
      categoryId: categories[0].id,
      status: CourseStatus.PUBLISHED,
      level: CourseLevel.BEGINNER,
      price: 9999,
      comparePrice: 19999,
      isFree: false,
      language: 'English',
      tags: ['react', 'javascript', 'frontend', 'web development'],
      whatYoullLearn: [
        'Build powerful, fast, user-friendly web apps',
        'Understand how React works under the hood',
        'Master React Hooks (useState, useEffect, useContext)',
        'Manage global state with Zustand and Redux Toolkit',
        'Build full-stack apps with Next.js 14',
        'TypeScript with React',
      ],
      requirements: [
        'Basic HTML, CSS, JavaScript knowledge',
        'A computer with internet access',
      ],
      totalStudents: 1247,
      rating: 4.8,
      reviewCount: 312,
      totalDuration: 144000,
      totalLessons: 180,
    },
  });

  // Section 1
  const section1 = await prisma.section.upsert({
    where: { id: 'seed-section-1' },
    update: {},
    create: {
      id: 'seed-section-1',
      courseId: course1.id,
      title: 'Getting Started with React',
      order: 1,
    },
  });

  await Promise.all([
    prisma.lesson.upsert({
      where: { id: 'seed-lesson-1' },
      update: {},
      create: {
        id: 'seed-lesson-1',
        sectionId: section1.id,
        title: 'Course Introduction',
        type: 'VIDEO' as any,
        order: 1,
        isFree: true,
        duration: 300,
        description: 'Welcome to the course! Let\'s see what we\'ll build.',
      },
    }),
    prisma.lesson.upsert({
      where: { id: 'seed-lesson-2' },
      update: {},
      create: {
        id: 'seed-lesson-2',
        sectionId: section1.id,
        title: 'Setting Up the Development Environment',
        type: 'VIDEO' as any,
        order: 2,
        isFree: true,
        duration: 600,
      },
    }),
    prisma.lesson.upsert({
      where: { id: 'seed-lesson-3' },
      update: {},
      create: {
        id: 'seed-lesson-3',
        sectionId: section1.id,
        title: 'Your First React Component',
        type: 'VIDEO' as any,
        order: 3,
        isFree: false,
        duration: 900,
      },
    }),
  ]);

  // Enroll student in course
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course1.id } },
    update: {},
    create: {
      userId: student.id,
      courseId: course1.id,
      progress: 33,
    },
  });

  // Community
  await prisma.community.upsert({
    where: { slug: 'general' },
    update: {},
    create: {
      name: 'General Discussion',
      slug: 'general',
      description: 'Talk about anything related to learning and development.',
    },
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 Test Accounts:');
  console.log('  Admin:      admin@lms.dev      / Admin@123456');
  console.log('  Instructor: instructor@lms.dev  / Instructor@123');
  console.log('  Student:    student@lms.dev     / Student@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
