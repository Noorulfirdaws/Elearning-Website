import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ScormService } from './scorm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('scorm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scorm')
export class ScormController {
  constructor(private readonly scormService: ScormService) {}

  @Post('courses/:courseId/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadPackage(
    @Param('courseId') courseId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.scormService.uploadPackage(file.buffer, file.originalname, courseId, userId);
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string) {
    return this.scormService.getPackage(id);
  }

  @Get('packages/:id/launch')
  getLaunchUrl(@Param('id') id: string) {
    return this.scormService.getLaunchUrl(id);
  }

  // SCORM 1.2 LMS API endpoints (called by SCORM content via postMessage/iframe)
  @Public()
  @Post('packages/:id/scorm12/commit')
  saveScorm12(
    @Param('id') packageId: string,
    @Query('userId') userId: string,
    @Body() data: Record<string, string>,
  ) {
    return this.scormService.saveScorm12Data(packageId, userId, data);
  }

  @Public()
  @Get('packages/:id/scorm12/data')
  getScorm12Data(@Param('id') packageId: string, @Query('userId') userId: string) {
    return this.scormService.getScormData(packageId, userId);
  }

  // SCORM 2004 endpoints
  @Public()
  @Post('packages/:id/scorm2004/commit')
  saveScorm2004(
    @Param('id') packageId: string,
    @Query('userId') userId: string,
    @Body() data: Record<string, string>,
  ) {
    return this.scormService.saveScorm2004Data(packageId, userId, data);
  }

  @Public()
  @Get('packages/:id/scorm2004/data')
  getScorm2004Data(@Param('id') packageId: string, @Query('userId') userId: string) {
    return this.scormService.getScormData(packageId, userId);
  }
}
