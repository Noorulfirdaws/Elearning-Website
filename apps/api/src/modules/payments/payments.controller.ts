import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, Req, Headers, RawBodyRequest, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, PaymentStatus } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('stripe/checkout/:courseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  createCheckout(
    @Param('courseId') courseId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { couponCode?: string },
  ) {
    return this.paymentsService.createStripeCheckoutSession(userId, courseId, body.couponCode);
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
  }

  @Post('coupon/validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a coupon code' })
  validateCoupon(
    @Body() body: { code: string; courseId: string; amount: number },
  ) {
    return this.paymentsService.validateCoupon(body.code, body.courseId, body.amount);
  }

  @Get('my-payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user payments' })
  getMyPayments(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getUserPayments(userId, page, limit);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (admin)' })
  getAdminPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.paymentsService.getAdminPayments(page, limit, status);
  }

  @Post('admin/coupons')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create coupon (admin)' })
  createCoupon(@Body() body: any) {
    return this.paymentsService.createCoupon(body);
  }
}
