import { Controller, Post, Get, Param, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  createUploadUrl() {
    return this.videoService.createUploadUrl();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('uploads/:id/status')
  getUploadStatus(@Param('id') id: string) {
    return this.videoService.getUploadStatus(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('assets/:id')
  getAsset(@Param('id') id: string) {
    return this.videoService.getAsset(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('playback-token/:playbackId')
  createPlaybackToken(@Param('playbackId') playbackId: string) {
    return this.videoService.createSignedPlaybackToken(playbackId);
  }

  @Public()
  @Post('webhooks/mux')
  handleMuxWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('mux-signature') signature: string,
  ) {
    const payload = req.rawBody?.toString() || '';
    return this.videoService.handleWebhook(payload, signature);
  }
}
