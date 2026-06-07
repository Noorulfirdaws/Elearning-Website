import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeedbackService, FeedbackType } from './feedback.service';

@ApiTags('beta')
@Controller('beta/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit beta feedback' })
  submit(
    @Body() body: {
      userId:      string;
      type:        FeedbackType;
      sentiment:   'positive' | 'neutral' | 'negative';
      title:       string;
      description: string;
      feature:     string;
      url:         string;
      userAgent?:  string;
      rating:      number;
      screenshot?: string;
      metadata?:   Record<string, unknown>;
    },
  ) {
    return this.feedbackService.submit({
      ...body,
      userAgent:  body.userAgent  ?? '',
      screenshot: body.screenshot ?? null,
      metadata:   body.metadata   ?? {},
    });
  }

  @Get()
  @ApiOperation({ summary: 'List feedback (admin)' })
  @ApiQuery({ name: 'type',     required: false })
  @ApiQuery({ name: 'resolved', required: false })
  @ApiQuery({ name: 'feature',  required: false })
  list(
    @Query('type')     type?: FeedbackType,
    @Query('resolved') resolved?: string,
    @Query('feature')  feature?: string,
  ) {
    return this.feedbackService.list({
      type,
      feature,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Feedback statistics' })
  stats() {
    return this.feedbackService.stats();
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark feedback as resolved' })
  resolve(@Param('id') id: string, @Body() body: { resolution: string }) {
    return this.feedbackService.resolve(id, body.resolution);
  }
}
