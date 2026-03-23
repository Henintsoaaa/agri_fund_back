import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { InvestmentService } from '../investment/investment.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let transactionService: TransactionService;
  let investmentService: InvestmentService;

  const mockInvestment = {
    id: 'inv-123',
    userId: 'user-123',
    amount: 1000,
    status: 'PENDING',
    projectStageId: 'stage-123',
    projectStage: {
      id: 'stage-123',
      title: 'Stage 1',
      projectId: 'proj-123',
      project: {
        id: 'proj-123',
        title: 'Test Project',
      },
    },
  };

  const mockTransaction = {
    id: 'trans-123',
    investmentId: 'inv-123',
    amount: 1000,
    status: 'PENDING',
    provider: 'STRIPE',
    type: 'PAYMENT',
  };

  const mockPrismaService = {
    investment: {
      findUnique: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockTransactionService = {
    createTransaction: jest.fn(),
    updateTransactionStatus: jest.fn(),
  };

  const mockInvestmentService = {
    confirmInvestment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: InvestmentService, useValue: mockInvestmentService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    transactionService = module.get<TransactionService>(TransactionService);
    investmentService = module.get<InvestmentService>(InvestmentService);

    // Reset mocks
    jest.clearAllMocks();

    // Set Stripe secret key in environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
  });

  describe('processPayment', () => {
    it('should throw BadRequestException if amount is <= 0', async () => {
      await expect(
        service.processPayment('inv-123', 0, 'STRIPE'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.processPayment('inv-123', -100, 'STRIPE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if investment does not exist', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(null);

      await expect(
        service.processPayment('inv-123', 1000, 'STRIPE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own investment', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);

      const user = { id: 'different-user', role: 'INVESTOR' };

      await expect(
        service.processPayment('inv-123', 1000, 'STRIPE', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to process payment for any investment', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      const adminUser = { id: 'admin-user', role: 'ADMIN' };

      // Mock Stripe payment intent creation
      const result = await service.processPayment(
        'inv-123',
        1000,
        'STRIPE',
        adminUser,
      );

      expect(result).toBeDefined();
      expect(mockTransactionService.createTransaction).toHaveBeenCalled();
    });

    it('should create transaction and process Stripe payment', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      const user = { id: 'user-123', role: 'INVESTOR' };

      const result = await service.processPayment(
        'inv-123',
        1000,
        'STRIPE',
        user,
      );

      expect(mockPrismaService.investment.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        include: expect.any(Object),
      });

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        investmentId: 'inv-123',
        amount: 1000,
        type: 'PAYMENT',
        provider: 'STRIPE',
      });

      expect(result).toBeDefined();
      expect(result.paymentId).toBeDefined();
    });

    it('should throw BadRequestException for PayPal provider', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      const user = { id: 'user-123', role: 'INVESTOR' };

      await expect(
        service.processPayment('inv-123', 1000, 'PAYPAL', user),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process bank transfer and return instructions', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      const user = { id: 'user-123', role: 'INVESTOR' };

      const result = await service.processPayment(
        'inv-123',
        1000,
        'BANK_TRANSFER',
        user,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.instructions).toBeDefined();
    });
  });

  describe('getProviderStatus', () => {
    it('should throw NotFoundException if transaction does not exist', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.getProviderStatus('trans-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own transaction', async () => {
      const transaction = {
        ...mockTransaction,
        investment: mockInvestment,
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);

      const user = { id: 'different-user', role: 'INVESTOR' };

      await expect(
        service.getProviderStatus('trans-123', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to check any transaction status', async () => {
      const transaction = {
        ...mockTransaction,
        investment: mockInvestment,
        providerTransactionId: null,
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);

      const adminUser = { id: 'admin-user', role: 'ADMIN' };

      const result = await service.getProviderStatus('trans-123', adminUser);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('trans-123');
    });

    it('should return transaction status if no provider transaction ID', async () => {
      const transaction = {
        ...mockTransaction,
        investment: mockInvestment,
        providerTransactionId: null,
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);

      const user = { id: 'user-123', role: 'INVESTOR' };

      const result = await service.getProviderStatus('trans-123', user);

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.message).toContain('Aucun ID de transaction provider');
    });
  });

  describe('Authorization Checks', () => {
    it('should enforce ownership for non-admin users', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue({
        ...mockInvestment,
        userId: 'user-123',
      });

      const differentUser = { id: 'user-456', role: 'INVESTOR' };

      await expect(
        service.processPayment('inv-123', 1000, 'STRIPE', differentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to process their own payment', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      const owner = { id: 'user-123', role: 'INVESTOR' };

      const result = await service.processPayment(
        'inv-123',
        1000,
        'BANK_TRANSFER',
        owner,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle Stripe errors gracefully', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(mockInvestment);
      mockTransactionService.createTransaction.mockResolvedValue(mockTransaction);

      // Force Stripe to throw an error by using invalid API key
      process.env.STRIPE_SECRET_KEY = 'invalid_key';

      // Recreate service to pick up new env variable
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: TransactionService, useValue: mockTransactionService },
          { provide: InvestmentService, useValue: mockInvestmentService },
        ],
      }).compile();

      const newService = module.get<PaymentService>(PaymentService);

      const user = { id: 'user-123', role: 'INVESTOR' };

      // This should handle the error and throw InternalServerErrorException
      await expect(
        newService.processPayment('inv-123', 1000, 'STRIPE', user),
      ).rejects.toThrow();
    });

    it('should handle missing Stripe configuration', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: TransactionService, useValue: mockTransactionService },
          { provide: InvestmentService, useValue: mockInvestmentService },
        ],
      }).compile();

      const newService = module.get<PaymentService>(PaymentService);

      // Service should be created but Stripe operations should fail
      expect(newService).toBeDefined();
    });
  });
});
