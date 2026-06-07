import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  course: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  payment: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  enrollment: { upsert: jest.fn() },
  coupon: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  notification: { create: jest.fn() },
};

const mockConfig = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'app.stripe.secretKey') return 'sk_test_mock';
    if (key === 'app.stripe.webhookSecret') return 'whsec_mock';
    if (key === 'app.frontendUrl') return 'http://localhost:3000';
    return null;
  }),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('validateCoupon', () => {
    it('throws for nonexistent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.validateCoupon('INVALID', 'course-1')).rejects.toThrow(BadRequestException);
    });

    it('throws for expired coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'c1', code: 'EXPIRED', isActive: true,
        expiresAt: new Date('2020-01-01'),
        usageLimit: null, usageCount: 0,
        courseIds: [],
      });
      await expect(service.validateCoupon('EXPIRED', 'course-1')).rejects.toThrow(BadRequestException);
    });

    it('returns discount for valid coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'c1', code: 'SAVE20', isActive: true,
        expiresAt: null, usageLimit: null, usageCount: 0,
        courseIds: [], discount: 20, discountType: 'PERCENTAGE',
      });
      const result = await service.validateCoupon('SAVE20', 'course-1');
      expect(result).toHaveProperty('discount', 20);
    });
  });

  describe('getUserPayments', () => {
    it('returns user payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      const result = await service.getUserPayments('user-1');
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
      expect(result).toEqual([]);
    });
  });
});
