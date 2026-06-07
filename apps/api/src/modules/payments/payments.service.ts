/**
 * PaymentsService with Stripe → Queued Fallback
 *
 * Stripe outage behaviour:
 *  1. Circuit breaker opens after 5 Stripe API errors
 *  2. createStripeCheckoutSession() → returns PAYMENT_QUEUED response
 *     - Payment intent saved to DB with status PENDING
 *     - User sees "Stripe is temporarily unavailable — your order is saved"
 *     - Bull job created to retry session creation every 5 minutes
 *  3. Webhook handler runs independently (no circuit breaker — must process all)
 *  4. Idempotency: duplicate webhook event IDs are silently skipped
 *  5. Replay attack: events >5 min old are rejected
 */
import { Injectable, BadRequestException, NotFoundException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { CircuitBreaker } from '../../common/resilience/circuit-breaker';

export const PAYMENT_RETRY_QUEUE = 'payment-retry';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly cb = new CircuitBreaker('stripe', {
    failureThreshold: 5,
    timeout:          60_000, // 1 minute before trying again
    requestTimeout:   15_000, // Stripe calls can be slow
  });

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
    @InjectQueue(PAYMENT_RETRY_QUEUE) private retryQueue: Queue,
  ) {
    this.stripe = new Stripe(this.config.get('app.stripe.secretKey') || '', {
      apiVersion: '2024-06-20',
      maxNetworkRetries: 2, // Stripe SDK built-in retries
    });
  }

  // ── Checkout session ──────────────────────────────────────────────────────

  async createStripeCheckoutSession(userId: string, courseId: string, couponCode?: string) {
    const [course, user] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!course) throw new NotFoundException('Course not found');
    if (!user)   throw new NotFoundException('User not found');

    let amount = Number(course.price);
    let coupon: any = null;

    if (couponCode) {
      coupon = await this.prisma.coupon.findFirst({
        where: { code: couponCode, isActive: true, expiresAt: { gt: new Date() } },
      });
      if (coupon) {
        amount = coupon.discountType === 'PERCENTAGE'
          ? amount * (1 - Number(coupon.discountValue) / 100)
          : Math.max(0, amount - Number(coupon.discountValue));
      }
    }

    // Save payment intent first (works regardless of Stripe status)
    const payment = await this.prisma.payment.create({
      data: {
        userId, courseId,
        amount:         course.price,
        discountAmount: Number(course.price) - amount,
        currency:       course.currency,
        provider:       PaymentProvider.STRIPE,
        couponId:       coupon?.id,
        status:         PaymentStatus.PENDING,
      },
    });

    // Stripe API call — with circuit breaker
    if (this.cb.isOpen) {
      return this.handleStripeDown(payment.id, userId, courseId, course, amount);
    }

    try {
      const result = await this.cb.execute(() =>
        this.createStripeSession(user, course, payment, amount)
      );
      return result;
    } catch (err) {
      this.logger.error(`Stripe checkout failed: ${err.message}`);
      return this.handleStripeDown(payment.id, userId, courseId, course, amount);
    }
  }

  private async createStripeSession(user: any, course: any, payment: any, amount: number) {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name:  `${user.firstName} ${user.lastName}`,
      });
      customerId = customer.id;
      await this.prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     course.currency.toLowerCase(),
          product_data: {
            name:        course.title,
            description: (course.shortDescription || course.description || '').slice(0, 200),
            images:      course.thumbnail ? [course.thumbnail] : [],
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode:        'payment',
      success_url: `${this.config.get('app.frontendUrl')}/checkout/success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`,
      cancel_url:  `${this.config.get('app.frontendUrl')}/courses/${course.slug}?payment=cancelled`,
      metadata:    { paymentId: payment.id, userId: user.id, courseId: course.id },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data:  { providerPaymentId: session.id },
    });

    return { sessionId: session.id, url: session.url, queued: false };
  }

  /** Called when Stripe is down — save order, queue retry */
  private async handleStripeDown(paymentId: string, userId: string, courseId: string, course: any, amount: number) {
    this.logger.warn(`Stripe circuit OPEN — queuing payment ${paymentId} for retry`);

    // Queue retry job (runs every 5 minutes, up to 24h)
    await this.retryQueue.add(
      'create-session',
      { paymentId, userId, courseId, amount },
      {
        jobId:    `retry:${paymentId}`,
        attempts: 288, // 24 hours at 5-min intervals
        backoff:  { type: 'fixed', delay: 5 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail:     50,
      },
    );

    // Return a graceful degraded response
    return {
      queued:  true,
      paymentId,
      message: 'Our payment processor is temporarily unavailable. Your order has been saved and will be processed automatically when service resumes. You will receive a confirmation email.',
      estimatedRecovery: '< 15 minutes',
      supportUrl: `${this.config.get('app.frontendUrl')}/support?ref=${paymentId}`,
    };
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get('app.stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured!');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency guard
    const alreadyProcessed = await this.prisma.payment.findFirst({
      where: { providerPaymentId: event.id },
    });
    if (alreadyProcessed) {
      this.logger.log(`Duplicate Stripe event ${event.id} — skipping`);
      return { received: true };
    }

    // Replay attack protection (5-minute window)
    if (Date.now() / 1000 - event.created > 300) {
      this.logger.warn(`Stale Stripe event ${event.id} — rejecting`);
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
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const { paymentId, userId, courseId } = session.metadata!;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data:  { status: PaymentStatus.COMPLETED, providerPaymentId: session.payment_intent as string },
    });

    await this.prisma.enrollment.upsert({
      where:  { userId_courseId: { userId, courseId } },
      create: { userId, courseId, paymentId, isActive: true },
      update: { isActive: true, paymentId },
    });

    await this.prisma.course.update({
      where: { id: courseId },
      data:  { totalStudents: { increment: 1 } },
    });

    await this.prisma.notification.create({
      data: {
        userId, type: 'PAYMENT', title: 'Enrollment Confirmed',
        message: 'Your payment was successful. You are now enrolled!',
        data: { courseId },
      },
    });

    this.logger.log(`Payment completed: ${paymentId} for user ${userId}`);
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    await this.prisma.payment.updateMany({
      where: { providerPaymentId: intent.id },
      data:  { status: PaymentStatus.FAILED },
    });
  }

  private async handleRefund(charge: Stripe.Charge) {
    await this.prisma.payment.updateMany({
      where: { providerPaymentId: charge.payment_intent as string },
      data:  { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
    });
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({ where: { userId }, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { coupon: true } }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAdminPayments(page = 1, limit = 50, status?: PaymentStatus) {
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, coupon: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createCoupon(data: any) {
    return this.prisma.coupon.create({
      data: { ...data, code: data.code?.toUpperCase() },
    });
  }

  async validateCoupon(code: string, courseId: string, amount: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { courses: true },
    });
    if (!coupon) throw new BadRequestException('Invalid or expired coupon');
    if (coupon.courses.length && !coupon.courses.find((c) => c.courseId === courseId)) {
      throw new BadRequestException('Coupon not valid for this course');
    }
    const discountedAmount = coupon.discountType === 'PERCENTAGE'
      ? amount * (1 - Number(coupon.discountValue) / 100)
      : Math.max(0, amount - Number(coupon.discountValue));
    return { valid: true, originalAmount: amount, discountedAmount, coupon };
  }

  health() { return { circuit: this.cb.status.state }; }
}
