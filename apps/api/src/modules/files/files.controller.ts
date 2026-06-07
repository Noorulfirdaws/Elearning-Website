import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  getUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() body: { filename: string; mimeType: string; size: number },
  ) {
    return this.filesService.getPresignedUploadUrl(userId, body.filename, body.mimeType, body.size);
  }

  @Get('download-url')
  getDownloadUrl(
    @Query('key') key: string,
    @CurrentUser('id') userId: string,
  ) {
    // Validate the requesting user owns the file key (prefix check prevents IDOR)
    if (!key || key.includes('..') || (!key.startsWith(`uploads/${userId}/`) && !key.startsWith('public/'))) {
      throw new Error('Access denied to requested file');
    }
    return this.filesService.getPresignedDownloadUrl(key);
  }

  @Get('my-files')
  getMyFiles(@CurrentUser('id') userId: string) {
    return this.filesService.getUserFiles(userId);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.deleteFile(id, userId);
  }
}
