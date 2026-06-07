import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Public()
  @Get('communities')
  getCommunities() {
    return this.communityService.getCommunities();
  }

  @Post('communities/:id/join')
  joinCommunity(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.communityService.joinCommunity(id, userId);
  }

  @Delete('communities/:id/leave')
  leaveCommunity(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.communityService.leaveCommunity(id, userId);
  }

  @Public()
  @Get('posts')
  getPosts(
    @Query('communityId') communityId: string,
    @Query('courseId') courseId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.communityService.getPosts(communityId, courseId, +page || 1, +limit || 20);
  }

  @Post('posts')
  createPost(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.communityService.createPost(userId, body);
  }

  @Public()
  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.communityService.getPost(id);
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.communityService.updatePost(id, userId, body);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.communityService.deletePost(id, userId);
  }

  @Post('posts/:id/comments')
  addComment(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.communityService.addComment(postId, userId, body.content, body.parentId);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.communityService.deleteComment(id, userId);
  }

  @Post('posts/:id/react')
  toggleReaction(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @Body('type') type: string,
  ) {
    return this.communityService.toggleReaction(postId, userId, type);
  }
}
