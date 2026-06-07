import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(this.config.get('app.stripe.secretKey') || 'sk_test_placeholder', {
      apiVersion: '2024-06-20',
    });
  }

  async createStripeCheckoutSession(userId: string, courseId: string, couponCode?: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let amount = Number(course.price);
    let coupon: any = null;

    if (couponCode) {
      coupon = await this.prisma.coupon.findFirst({
        where: { code: couponCode, isActive: true, expiresAt: { gt: new Date() } },
      });
      if (coupon) {
        if (coupon.discountType === 'PERCENTAGE') {
          amount = amount * (1 - Number(coupon.discountValue) / 100);
        } else {
          amount = Math.max(0, amount - Number(coupon.discountValue));
        }
      }
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: user.email, name: `${user.firstName} ${user.lastName}` });
      customerId = customer.id;
      await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        discountAmount: Number(course.price) - amount,
        currency: course.currency,
        provider: PaymentProvider.STRIPE,
        couponId: coupon?.id,
        status: PaymentStatus.PENDING,
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            product_data: {
              name: course.title,
              description: course.shortDescription || course.description.slice(0, 200),
              images: course.thumbnail ? [course.thumbnail] : [],
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${this.config.get('app.frontendUrl')}/checkout/success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`,
      cancel_url: `${this.config.get('app.frontendUrl')}/courses/${course.slug}?payment=cancelled`,
      metadata: { paymentId: payment.id, userId, courseId },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: session.id },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get('app.stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured!');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;
    try {
      // constructEvent verifies HMAC-SHA256 signature using the raw payload buffer
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency: skip events already processed
    const alreadyProcessed = await this.prisma.payment.findFirst({
      where: { providerPaymentId: event.id },
    });
    if (alreadyProcessed) {
      this.logger.log(`Duplicate Stripe event ${event.id} — skipping`);
      return { received: true };
    }

    // Reject events older than 5 minutes (replay attack protection)
    const eventAge = Date.now() / 1000 - event.created;
    if (eventAge > 300) {
      this.logger.warn(`Stale Stripe event ${event.id} age=${eventAge}s — rejecting`);
      throw new BadRequestException('Webhook event too old');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const { paymentId, userId, courseId } = session.metadata!;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COMPLETED, providerPaymentId: session.payment_intent as string },
    });

    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, paymentId, isActive: true },
      update: { isActive: true, paymentId },
    });

    await this.prisma.course.update({
      where: { id: courseId },
      data: { totalStudents: { increment: 1 } },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'PAYMENT',
        title: 'Enrollment Confirmed',
        message: 'Your payment was successful. You are now enrolled!',
        data: { courseId },
      },
    });

    this.logger.log(`Payment completed: ${paymentId} for user ${userId}`);
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    await this.prisma.payment.updateMany({
      where: { providerPaymentId: intent.id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  private async handleRefund(charge: Stripe.Charge) {
    await this.prisma.payment.updateMany({
      where: { providerPaymentId: charge.payment_intent as string },
      data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
    });
  }

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { coupon: true },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAdminPayments(page = 1, limit = 50, status?: PaymentStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          coupon: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createCoupon(data: {
    code: string;
    discountType: string;
    discountValue: number;
    maxUses?: number;
    minPurchase?: number;
    expiresAt?: Date;
    courseIds?: string[];
    description?: string;
  }) {
    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        minPurchase: data.minPurchase,
        expiresAt: data.expiresAt,
        courses: data.courseIds
          ? { create: data.courseIds.map((courseId) => ({ courseId })) }
          : undefined,
      },
    });
  }

  async validateCoupon(code: string, courseId: string, amount: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        OR: [{ maxUses: null }, { usedCount: { lt: this.prisma.coupon.fields.maxUses } }],
      },
      include: { courses: true },
    });

    if (!coupon) throw new BadRequestException('Invalid or expired coupon');

    const courseRestricted = coupon.courses.length > 0;
    if (courseRestricted && !coupon.courses.find((c) => c.courseId === courseId)) {
      throw new BadRequestException('Coupon not valid for this course');
    }

    if (coupon.minPurchase && amount < Number(coupon.minPurchase)) {
      throw new BadRequestException(`Minimum purchase amount is ${coupon.minPurchase}`);
    }

    let discountedAmount = amount;
    if (coupon.discountType === 'PERCENTAGE') {
      discountedAmount = amount * (1 - Number(coupon.discountValue) / 100);
    } else {
      discountedAmount = Math.max(0, amount - Number(coupon.discountValue));
    }

    return { valid: true, originalAmount: amount, discountedAmount, coupon };
  }
}
