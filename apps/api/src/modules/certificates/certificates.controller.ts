import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Post(':courseId/generate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate certificate for completed course' })
  generate(@Param('courseId') courseId: string, @CurrentUser('id') userId: string) {
    return this.certificatesService.generate(userId, courseId);
  }

  @Get('my-certificates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all certificates for current user' })
  getMyCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getUserCertificates(userId);
  }

  @Public()
  @Get('verify/:uniqueId')
  @ApiOperation({ summary: 'Verify certificate by unique ID (public)' })
  verify(@Param('uniqueId') uniqueId: string) {
    return this.certificatesService.findByUniqueId(uniqueId);
  }

  @Get('templates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate templates' })
  getTemplates() {
    return this.certificatesService.getTemplates();
  }

  @Post('templates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create certificate template (admin)' })
  createTemplate(@Body() body: { name: string; html: string; css?: string; fields?: any }) {
    return this.certificatesService.createTemplate(body);
  }
}
