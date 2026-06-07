import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get('instructors')
  getFeaturedInstructors() {
    return this.marketplaceService.getFeaturedInstructors();
  }

  @Public()
  @Get('top-courses')
  getTopCourses() {
    return this.marketplaceService.getTopCourses();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('instructor/onboard')
  onboardInstructor(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.marketplaceService.onboardInstructor(userId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('instructor/status')
  checkStatus(@CurrentUser('id') userId: string) {
    return this.marketplaceService.checkInstructorStatus(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('instructor/earnings')
  getEarnings(
    @CurrentUser('id') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.marketplaceService.getEarnings(userId, +page || 1, +limit || 20);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('instructor/payout')
  createPayout(@CurrentUser('id') userId: string, @Body('amount') amount: number) {
    return this.marketplaceService.createPayout(userId, amount);
  }
}
