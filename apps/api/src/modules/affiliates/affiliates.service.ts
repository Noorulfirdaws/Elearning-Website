import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class AffiliatesService {
  constructor(private prisma: PrismaService) {}

  async applyForAffiliate(userId: string, data: { paypalEmail?: string; website?: string }) {
    const existing = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.affiliate.create({
      data: { userId, paypalEmail: data.paypalEmail, website: data.website, status: 'PENDING' },
    });
  }

  async getMyAffiliate(userId: string) {
    return this.prisma.affiliate.findUnique({
      where: { userId },
      include: { referrals: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
  }

  async getAffiliateDashboard(userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('Affiliate profile not found');
    const [totalReferrals, totalEarnings] = await Promise.all([
      this.prisma.affiliateReferral.count({ where: { affiliateId: affiliate.id } }),
      this.prisma.affiliateReferral.aggregate({
        where: { affiliateId: affiliate.id, status: 'PAID' },
        _sum: { commission: true },
      }),
    ]);
    return { affiliate, totalReferrals, totalEarnings: totalEarnings._sum.commission ?? 0 };
  }

  async generateAffiliateLink(userId: string, courseId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('Not an affiliate');
    const baseUrl = process.env.APP_URL || 'https://app.lmsplatform.com';
    return { url: `${baseUrl}/courses?ref=${affiliate.code}&course=${courseId}` };
  }

  async approveAffiliate(affiliateId: string) {
    return this.prisma.affiliate.update({ where: { id: affiliateId }, data: { status: 'APPROVED' } });
  }

  async getAllAffiliates(status?: string) {
    return this.prisma.affiliate.findMany({
      where: status ? { status: status as any } : undefined,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
