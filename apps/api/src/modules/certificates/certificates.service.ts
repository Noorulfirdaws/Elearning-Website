import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async generate(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId, isActive: true },
    });
    if (!enrollment) throw new ForbiddenException('Not enrolled in this course');

    const exists = await this.prisma.certificate.findFirst({ where: { userId, courseId } });
    if (exists) return exists;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: { select: { firstName: true, lastName: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const cert = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        data: {
          studentName: `${user.firstName} ${user.lastName}`,
          courseTitle: course.title,
          instructorName: `${course.instructor.firstName} ${course.instructor.lastName}`,
          completionDate: new Date().toISOString(),
        },
      },
    });

    const qrUrl = `${process.env.FRONTEND_URL}/certificates/${cert.uniqueId}`;
    const qrCode = await QRCode.toDataURL(qrUrl);

    return this.prisma.certificate.update({
      where: { id: cert.id },
      data: { qrCode },
      include: { course: { select: { title: true } }, user: { select: { firstName: true, lastName: true } } },
    });
  }

  async findByUniqueId(uniqueId: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { uniqueId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: { select: { title: true, instructor: { select: { firstName: true, lastName: true } } } },
        template: true,
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async getUserCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true, thumbnail: true, slug: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async createTemplate(data: { name: string; html: string; css?: string; fields?: any }) {
    return this.prisma.certificateTemplate.create({ data });
  }

  async getTemplates() {
    return this.prisma.certificateTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
