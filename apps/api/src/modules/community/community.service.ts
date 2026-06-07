import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  // Posts
  async createPost(userId: string, dto: {
    title: string; content: string; communityId?: string; courseId?: string; type?: string;
  }) {
    return this.prisma.post.create({
      data: { authorId: userId, ...dto, type: (dto.type as any) || 'DISCUSSION' },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async getPosts(communityId?: string, courseId?: string, page = 1, limit = 20) {
    const where: any = {};
    if (communityId) where.communityId = communityId;
    if (courseId) where.courseId = courseId;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { posts, total, page, limit };
  }

  async getPost(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        comments: {
          where: { parentId: null },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            replies: {
              include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reactions: true,
        _count: { select: { comments: true, reactions: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not your post');
    return this.prisma.post.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not your post');
    await this.prisma.post.delete({ where: { id } });
  }

  // Comments
  async addComment(postId: string, userId: string, content: string, parentId?: string) {
    return this.prisma.comment.create({
      data: { postId, authorId: userId, content, parentId },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Not your comment');
    await this.prisma.comment.delete({ where: { id } });
  }

  // Reactions
  async toggleReaction(postId: string, userId: string, type: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      if (existing.type === type) {
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed' };
      }
      return this.prisma.reaction.update({ where: { id: existing.id }, data: { type: type as any } });
    }
    return this.prisma.reaction.create({ data: { postId, userId, type: type as any } });
  }

  // Communities
  async getCommunities() {
    return this.prisma.community.findMany({
      include: { _count: { select: { members: true, posts: true } } },
    });
  }

  async joinCommunity(communityId: string, userId: string) {
    return this.prisma.communityMember.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId },
      update: {},
    });
  }

  async leaveCommunity(communityId: string, userId: string) {
    await this.prisma.communityMember.delete({
      where: { communityId_userId: { communityId, userId } },
    });
  }
}
