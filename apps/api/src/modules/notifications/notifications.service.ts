import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('app.smtp.host'),
      port: this.config.get('app.smtp.port'),
      auth: {
        user: this.config.get('app.smtp.user'),
        pass: this.config.get('app.smtp.pass'),
      },
    });
  }

  async create(userId: string, title: string, message: string, type: string, link?: string) {
    return this.prisma.notification.create({
      data: { userId, title, message, type: type as any, link },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications, total, unreadCount, page, limit };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('app.smtp.from'),
        to,
        subject,
        html,
      });
    } catch (err) {
      console.error('Email send error:', err);
    }
  }

  async sendEnrollmentEmail(userEmail: string, userName: string, courseName: string) {
    await this.sendEmail(
      userEmail,
      `You're enrolled in ${courseName}!`,
      `<h1>Welcome, ${userName}!</h1><p>You've successfully enrolled in <strong>${courseName}</strong>. Start learning now!</p>`,
    );
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    await this.sendEmail(
      email,
      'Reset your password',
      `<h1>Password Reset</h1><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${resetUrl}">Reset Password</a>`,
    );
  }

  async sendCertificateEmail(email: string, userName: string, courseName: string, certUrl: string) {
    await this.sendEmail(
      email,
      `Your certificate for ${courseName} is ready!`,
      `<h1>Congratulations, ${userName}!</h1><p>You've completed <strong>${courseName}</strong>. <a href="${certUrl}">View your certificate</a></p>`,
    );
  }

  async deleteNotification(id: string, userId: string) {
    return this.prisma.notification.delete({ where: { id, userId } });
  }
}
