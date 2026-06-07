import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiMediaService } from './ai-media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ai-media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/media')
export class AiMediaController {
  constructor(private readonly aiMediaService: AiMediaService) {}

  @Post('voiceover')
  generateVoiceOver(@Body() body: {
    text: string; voice?: string; language?: string; speed?: number;
    courseId?: string; lessonId?: string;
  }) {
    return this.aiMediaService.generateVoiceOver(body);
  }

  @Post('lecture-script')
  generateLectureScript(@Body() body: {
    topic: string; duration: number; level: string;
    style?: 'formal' | 'conversational' | 'engaging'; includeExamples?: boolean;
  }) {
    return this.aiMediaService.generateLectureScript(body);
  }

  @Post('slides')
  generateSlides(@Body() body: { topic: string; slideCount: number; level: string; includeCode?: boolean }) {
    return this.aiMediaService.generateSlides(body);
  }

  @Post('thumbnail')
  generateThumbnail(@Body() body: { courseTitle: string; category: string; style?: string }) {
    return this.aiMediaService.generateCourseThumbnail(body);
  }

  @Post('video-job')
  createVideoJob(
    @CurrentUser('id') userId: string,
    @Body() body: { slides: any[]; voiceUrl?: string; style?: string; courseId: string },
  ) {
    return this.aiMediaService.createVideoJob({ ...body, userId });
  }

  @Get('video-job/:id')
  getVideoJobStatus(@Param('id') id: string) {
    return this.aiMediaService.getVideoJobStatus(id);
  }
}
