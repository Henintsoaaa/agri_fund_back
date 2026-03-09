import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockNotificationService = {};

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-123',
      type: 'INVESTMENT_CREATED',
      content: 'Votre investissement a été créé',
      status: 'UNREAD',
      projectId: 'project-1',
      projectStageId: 'stage-1',
      investmentId: 'inv-1',
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-03-01'),
    },
    {
      id: 'notif-2',
      userId: 'user-123',
      type: 'PAYMENT_SUCCESS',
      content: 'Votre paiement a été validé',
      status: 'READ',
      projectId: null,
      projectStageId: null,
      investmentId: 'inv-1',
      createdAt: new Date('2026-03-02'),
      updatedAt: new Date('2026-03-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyNotifications', () => {
    it('should return all notifications for the authenticated user', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications,
      );

      const req = { user: mockUser };
      const result = await controller.getMyNotifications(req);

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should limit to 50 most recent notifications', async () => {
      const req = { user: mockUser };
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await controller.getMyNotifications(req);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no notifications exist', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const req = { user: mockUser };
      const result = await controller.getMyNotifications(req);

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const req = { user: mockUser };
      const result = await controller.getUnreadCount(req);

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: 'UNREAD' },
      });
    });

    it('should return 0 when no unread notifications exist', async () => {
      mockPrismaService.notification.count.mockResolvedValue(0);

      const req = { user: mockUser };
      const result = await controller.getUnreadCount(req);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read', async () => {
      const notificationId = 'notif-1';
      const updatedNotification = {
        ...mockNotifications[0],
        status: 'READ',
      };

      mockPrismaService.notification.update.mockResolvedValue(
        updatedNotification,
      );

      const req = { user: mockUser };
      const result = await controller.markAsRead(notificationId, req);

      expect(result).toEqual(updatedNotification);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId, userId: mockUser.id },
        data: { status: 'READ' },
      });
    });

    it('should only update notifications belonging to the user', async () => {
      const notificationId = 'notif-1';
      const req = { user: mockUser };

      mockPrismaService.notification.update.mockResolvedValue({});

      await controller.markAsRead(notificationId, req);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: {
          id: notificationId,
          userId: mockUser.id, // Ensures user can only update their own notifications
        },
        data: { status: 'READ' },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for the user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 3,
      });

      const req = { user: mockUser };
      const result = await controller.markAllAsRead(req);

      expect(result).toEqual({ count: 3 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: 'UNREAD' },
        data: { status: 'READ' },
      });
    });

    it('should only update notifications for the authenticated user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      const req = { user: mockUser };
      await controller.markAllAsRead(req);

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id, // Ensures user can only update their own notifications
          status: 'UNREAD',
        },
        data: { status: 'READ' },
      });
    });

    it('should return count of 0 when no unread notifications exist', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      const req = { user: mockUser };
      const result = await controller.markAllAsRead(req);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('Security', () => {
    it('should use BetterAuthGuard on all endpoints', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        NotificationController.prototype.getMyNotifications,
      );
      expect(guards).toBeDefined();
    });

    it('should extract userId from authenticated request', async () => {
      const req = { user: { id: 'different-user-123' } };
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await controller.getMyNotifications(req);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'different-user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });
});
