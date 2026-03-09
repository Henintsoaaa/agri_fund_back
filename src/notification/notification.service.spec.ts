import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    investment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyUserSignup', () => {
    it('should create notification for new user and all admins', async () => {
      const userId = 'user-123';
      const userName = 'John Doe';
      const mockAdmins = [
        { id: 'admin-1', name: 'Admin 1', email: 'admin1@test.com' },
        { id: 'admin-2', name: 'Admin 2', email: 'admin2@test.com' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
        userId,
        type: 'USER_SIGNUP',
        content: `Bienvenue ${userName} ! Votre compte a été créé avec succès.`,
        status: 'UNREAD',
      });

      await service.notifyUserSignup(userId, userName);

      // Should create 3 notifications (1 for user + 2 for admins)
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(3);

      // Check user notification
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'USER_SIGNUP',
          content: `Bienvenue ${userName} ! Votre compte a été créé avec succès.`,
          projectId: undefined,
          projectStageId: undefined,
          investmentId: undefined,
          status: 'UNREAD',
        },
      });
    });
  });

  describe('notifyInvestmentCreated', () => {
    it('should notify investor, project owner and all admins', async () => {
      const investmentData = {
        investmentId: 'inv-123',
        investorId: 'investor-123',
        investorName: 'Jane Investor',
        amount: 5000,
        projectStageId: 'stage-123',
        stageTitle: 'Phase 1',
        projectId: 'project-123',
        projectTitle: 'Green Energy Project',
        ownerId: 'owner-123',
      };

      const mockAdmins = [{ id: 'admin-1' }, { id: 'admin-2' }];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
      });

      await service.notifyInvestmentCreated(
        investmentData.investmentId,
        investmentData.investorId,
        investmentData.investorName,
        investmentData.amount,
        investmentData.projectStageId,
        investmentData.stageTitle,
        investmentData.projectId,
        investmentData.projectTitle,
        investmentData.ownerId,
      );

      // Should create 4 notifications (investor + owner + 2 admins)
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(4);

      // Check investor notification
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: investmentData.investorId,
          type: 'INVESTMENT_CREATED',
          content: expect.stringContaining('en attente de paiement'),
          projectId: investmentData.projectId,
          projectStageId: investmentData.projectStageId,
          investmentId: investmentData.investmentId,
          status: 'UNREAD',
        },
      });
    });
  });

  describe('notifyInvestmentConfirmed', () => {
    it('should send success notifications with checkmark emoji', async () => {
      const investmentData = {
        investmentId: 'inv-123',
        investorId: 'investor-123',
        investorName: 'Jane Investor',
        amount: 5000,
        projectStageId: 'stage-123',
        stageTitle: 'Phase 1',
        projectId: 'project-123',
        projectTitle: 'Green Energy Project',
        ownerId: 'owner-123',
      };

      const mockAdmins = [{ id: 'admin-1' }];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
      });

      await service.notifyInvestmentConfirmed(
        investmentData.investmentId,
        investmentData.investorId,
        investmentData.investorName,
        investmentData.amount,
        investmentData.projectStageId,
        investmentData.stageTitle,
        investmentData.projectId,
        investmentData.projectTitle,
        investmentData.ownerId,
      );

      // Should create 3 notifications
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(3);

      // Check for success emoji in investor notification
      const investorCall =
        mockPrismaService.notification.create.mock.calls.find(
          (call) => call[0].data.userId === investmentData.investorId,
        );
      expect(investorCall[0].data.content).toContain('✅');
    });
  });

  describe('notifyProjectStageFunded', () => {
    it('should send celebration notifications to all stakeholders', async () => {
      const stageData = {
        projectStageId: 'stage-123',
        projectId: 'project-123',
        stageTitle: 'Phase 1',
        projectTitle: 'Green Energy Project',
        ownerId: 'owner-123',
      };

      const mockAdmins = [{ id: 'admin-1' }];
      const mockInvestments = [
        { userId: 'investor-1', user: { id: 'investor-1', name: 'Inv 1' } },
        { userId: 'investor-2', user: { id: 'investor-2', name: 'Inv 2' } },
        { userId: 'investor-1', user: { id: 'investor-1', name: 'Inv 1' } }, // Duplicate
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.investment.findMany.mockResolvedValue(mockInvestments);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
      });

      await service.notifyProjectStageFunded(
        stageData.projectStageId,
        stageData.projectId,
        stageData.stageTitle,
        stageData.projectTitle,
        stageData.ownerId,
      );

      // Should create notifications for owner + 2 unique investors + 1 admin = 4
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(4);

      // Check for celebration emoji
      const ownerCall = mockPrismaService.notification.create.mock.calls.find(
        (call) => call[0].data.userId === stageData.ownerId,
      );
      expect(ownerCall[0].data.content).toContain('🎉');
    });
  });

  describe('notifyProjectSuspended', () => {
    it('should notify owner, investors and admins', async () => {
      const projectData = {
        projectId: 'project-123',
        projectTitle: 'Green Energy Project',
        ownerId: 'owner-123',
      };

      const mockAdmins = [{ id: 'admin-1' }];
      const mockInvestments = [
        { userId: 'investor-1', user: { id: 'investor-1', name: 'Inv 1' } },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.investment.findMany.mockResolvedValue(mockInvestments);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
      });

      await service.notifyProjectSuspended(
        projectData.projectId,
        projectData.projectTitle,
        projectData.ownerId,
      );

      // Should create notifications for owner + 1 investor + 1 admin = 3
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(3);

      // Check that all notifications have PROJECT_SUSPENDED type
      mockPrismaService.notification.create.mock.calls.forEach((call) => {
        expect(call[0].data.type).toBe('PROJECT_SUSPENDED');
      });
    });
  });

  describe('notifyDividendPaid', () => {
    it('should send dividend notification with money emoji', async () => {
      const investorId = 'investor-123';
      const amount = 1000;
      const projectTitle = 'Green Energy Project';
      const projectId = 'project-123';

      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
      });

      await service.notifyDividendPaid(
        investorId,
        amount,
        projectTitle,
        projectId,
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: investorId,
          type: 'DIVIDEND_PAID',
          content: expect.stringContaining('💰'),
          projectId,
          projectStageId: undefined,
          investmentId: undefined,
          status: 'UNREAD',
        },
      });
    });
  });

  describe('getAdmins', () => {
    it('should only return active and non-deleted admins', async () => {
      const mockAdmins = [
        { id: 'admin-1', name: 'Active Admin', email: 'admin1@test.com' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);

      await service.notifyUserSignup('user-123', 'Test User');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN', isActive: true, isDeleted: false },
        select: { id: true, name: true, email: true },
      });
    });
  });
});
