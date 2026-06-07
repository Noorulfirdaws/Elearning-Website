import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MarketplaceService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(this.config.get('app.stripe.secretKey') || '', { apiVersion: '2024-06-20' });
  }

  // Instructor onboarding to marketplace — Stripe Connect
  async onboardInstructor(userId: string, dto: {
    country: string;
    businessType: 'individual' | 'company';
    email: string;
  }) {
    let account = await this.prisma.instructorAccount.findUnique({ where: { userId } });

    if (!account) {
      const stripeAccount = await this.stripe.accounts.create({
        type: 'express',
        country: dto.country,
        email: dto.email,
        business_type: dto.businessType,
        capabilities: { transfers: { requested: true } },
      });

      account = await this.prisma.instructorAccount.create({
        data: {
          id: uuidv4(),
          userId,
          stripeAccountId: stripeAccount.id,
          status: 'PENDING',
          country: dto.country,
          revenueShare: 70, // instructor gets 70%, platform 30%
        },
      });
    }

    const frontendUrl = this.config.get('app.frontendUrl') || 'http://localhost:3000';
    const accountLink = await this.stripe.accountLinks.create({
      account: account.stripeAccountId,
      refresh_url: `${frontendUrl}/instructor/marketplace/onboard?retry=true`,
      return_url: `${frontendUrl}/instructor/marketplace/onboard/complete`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url, accountId: account.id };
  }

  async checkInstructorStatus(userId: string) {
    const account = await this.prisma.instructorAccount.findUnique({ where: { userId } });
    if (!account) return { status: 'NOT_STARTED' };

    const stripeAccount = await this.stripe.accounts.retrieve(account.stripeAccountId);
    const isEnabled = stripeAccount.charges_enabled && stripeAccount.payouts_enabled;

    if (isEnabled && account.status !== 'ACTIVE') {
      await this.prisma.instructorAccount.update({
        where: { id: account.id },
        data: { status: 'ACTIVE' },
      });
    }

    return {
      status: isEnabled ? 'ACTIVE' : 'PENDING',
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      requiresAction: stripeAccount.requirements?.currently_due || [],
    };
  }

  // Create payout to instructor
  async createPayout(userId: string, amount: number) {
    const account = await this.prisma.instructorAccount.findUnique({ where: { userId } });
    if (!account || account.status !== 'ACTIVE') {
      throw new BadRequestException('Instructor account not active');
    }

    const availableBalance = await this.getInstructorBalance(userId);
    if (availableBalance < amount) {
      throw new BadRequestException(`Insufficient balance. Available: $${(availableBalance / 100).toFixed(2)}`);
    }

    const transfer = await this.stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: account.stripeAccountId,
      metadata: { userId, type: 'instructor_payout' },
    });

    const payout = await this.prisma.instructorPayout.create({
      data: {
        id: uuidv4(),
        instructorAccountId: account.id,
        amount,
        currency: 'usd',
        stripeTransferId: transfer.id,
        status: 'COMPLETED',
      },
    });

    return payout;
  }

  async getInstructorBalance(userId: string): Promise<number> {
    const account = await this.prisma.instructorAccount.findUnique({ where: { userId } });
    if (!account) return 0;

    const earnings = await this.prisma.instructorEarning.aggregate({
      where: { instructorAccountId: account.id, isPaidOut: false },
      _sum: { amount: true },
    });

    return earnings._sum.amount || 0;
  }

  // Called when payment succeeds — split revenue
  async recordSale(paymentId: string, courseId: string, amount: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true },
    });
    if (!course) return;

    const account = await this.prisma.instructorAccount.findUnique({
      where: { userId: course.instructorId },
    });

    const revenueShare = account?.revenueShare || 70;
    const instructorAmount = Math.floor(amount * (revenueShare / 100));
    const platformAmount = amount - instructorAmount;

    if (account) {
      await this.prisma.instructorEarning.create({
        data: {
          id: uuidv4(),
          instructorAccountId: account.id,
          paymentId,
          courseId,
          grossAmount: amount,
          amount: instructorAmount,
          platformFee: platformAmount,
          revenueSharePct: revenueShare,
        },
      });
    }

    return { instructorAmount, platformAmount };
  }

  async getEarnings(userId: string, page = 1, limit = 20) {
    const account = await this.prisma.instructorAccount.findUnique({ where: { userId } });
    if (!account) return { earnings: [], total: 0, balance: 0 };

    const [earnings, total, balance] = await Promise.all([
      this.prisma.instructorEarning.findMany({
        where: { instructorAccountId: account.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { course: { select: { title: true, slug: true } } },
      }),
      this.prisma.instructorEarning.count({ where: { instructorAccountId: account.id } }),
      this.getInstructorBalance(userId),
    ]);

    return { earnings, total, balance, page, limit };
  }

  // Marketplace discovery
  async getFeaturedInstructors() {
    return this.prisma.user.findMany({
      where: { role: 'INSTRUCTOR', instructorAccount: { status: 'ACTIVE' } },
      select: {
        id: true, firstName: true, lastName: true, avatar: true, bio: true,
        _count: { select: { courses: true } },
      },
      orderBy: { courses: { _count: 'desc' } },
      take: 12,
    });
  }

  async getTopCourses() {
    return this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ totalStudents: 'desc' }, { rating: 'desc' }],
      take: 20,
      include: { instructor: { select: { id: true, firstName: true, lastName: true } }, category: true },
    });
  }
}
