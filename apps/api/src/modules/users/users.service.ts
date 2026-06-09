import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true, avatar: true,
        bio: true, role: true, timezone: true, language: true, createdAt: true,
        _count: { select: { enrollments: true, courses: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: {
    firstName?: string; lastName?: string; bio?: string; avatar?: string;
    timezone?: string; language?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        avatar: true, bio: true, role: true, timezone: true, language: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }

  async getNotificationSettings(userId: string) {
    return this.prisma.notificationSetting.findUnique({ where: { userId } });
  }

  async updateNotificationSettings(userId: string, settings: Record<string, boolean>) {
    return this.prisma.notificationSetting.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    });
  }

  // Admin methods
  async getAll(page = 1, limit = 20, search?: string, role?: UserRole) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          avatar: true, role: true, isBanned: true, createdAt: true,
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async banUser(adminId: string, userId: string, reason: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(admin.role)) {
      throw new ForbiddenException('Not authorized');
    }
    // Un ADMIN ne peut pas bannir un INSTRUCTOR ou un SUPER_ADMIN — réservé aux propriétaires
    if (admin.role === UserRole.ADMIN) {
      const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target && [UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR].includes(target.role)) {
        throw new ForbiddenException('Seuls les propriétaires peuvent gérer les instructeurs et les autres administrateurs');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, bannedReason: reason },
    });
  }

  async unbanUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(admin.role)) {
      throw new ForbiddenException('Not authorized');
    }
    // Un ADMIN ne peut pas débannir un INSTRUCTOR ou un SUPER_ADMIN
    if (admin.role === UserRole.ADMIN) {
      const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target && [UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR].includes(target.role)) {
        throw new ForbiddenException('Seuls les propriétaires peuvent gérer les instructeurs et les autres administrateurs');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, bannedReason: null },
    });
  }

  async changeRole(adminId: string, userId: string, role: UserRole) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can change roles');
    }
    return this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async deleteUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can delete users');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), email: `deleted_${userId}@deleted.invalid` },
    });
  }
}
