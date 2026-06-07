import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.membershipPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  }

  async getUserMembership(userId: string) {
    return this.prisma.userMembership.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { plan: true },
    });
  }

  async subscribeToPlan(userId: string, planId: string, stripeSubscriptionId: string) {
    const plan = await this.prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (plan.intervalMonths ?? 1));

    return this.prisma.userMembership.upsert({
      where: { userId },
      create: { userId, planId, status: 'ACTIVE', stripeSubscriptionId, expiresAt },
      update: { planId, status: 'ACTIVE', stripeSubscriptionId, expiresAt },
    });
  }

  async cancelMembership(userId: string) {
    return this.prisma.userMembership.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async checkMembershipAccess(userId: string, courseId: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId);
    if (!membership) return false;
    return membership.plan.accessLevel === 'ALL_COURSES';
  }
}
