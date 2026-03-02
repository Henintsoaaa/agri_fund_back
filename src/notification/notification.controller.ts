import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('my-notifications')
  @UseGuards(BetterAuthGuard)
  async getMyNotifications(@Req() req: any) {
    const userId = req.user.id;
    return this.prismaService.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('unread-count')
  @UseGuards(BetterAuthGuard)
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    const count = await this.prismaService.notification.count({
      where: { userId, status: 'UNREAD' },
    });
    return { count };
  }

  @Patch(':id/mark-read')
  @UseGuards(BetterAuthGuard)
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.prismaService.notification.update({
      where: { id, userId },
      data: { status: 'READ' },
    });
  }

  @Patch('mark-all-read')
  @UseGuards(BetterAuthGuard)
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    return this.prismaService.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ' },
    });
  }
}
