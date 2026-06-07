import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrg(userId: string, data: { name: string; slug: string; description?: string; logo?: string }) {
    return this.prisma.organization.create({
      data: {
        ...data,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
  }

  async getOrg(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { firstName: true, lastName: true, email: true, avatar: true } } } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async getMyOrgs(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });
  }

  async inviteMember(orgId: string, email: string, role: string, inviterId: string) {
    const membership = await this.prisma.orgMember.findFirst({ where: { organizationId: orgId, userId: inviterId } });
    if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) throw new ForbiddenException('Insufficient permissions');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.orgMember.create({ data: { organizationId: orgId, userId: user.id, role: role as any } });
  }

  async removeMember(orgId: string, memberId: string, requesterId: string) {
    const requester = await this.prisma.orgMember.findFirst({ where: { organizationId: orgId, userId: requesterId } });
    if (!requester || requester.role !== 'OWNER') throw new ForbiddenException('Only owners can remove members');
    return this.prisma.orgMember.deleteMany({ where: { organizationId: orgId, userId: memberId } });
  }

  async getOrgEnrollments(orgId: string) {
    const members = await this.prisma.orgMember.findMany({ where: { organizationId: orgId }, select: { userId: true } });
    const userIds = members.map((m) => m.userId);
    return this.prisma.enrollment.findMany({
      where: { userId: { in: userIds } },
      include: { course: { select: { title: true } }, user: { select: { firstName: true, lastName: true } } },
    });
  }
}
