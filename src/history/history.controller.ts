import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('history')
export class HistoryController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @UseGuards(BetterAuthGuard)
  async getHistory(@Req() req: any) {
    const userId = req.user.id;

    // Get user's transaction history
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        investment: {
          userId,
        },
      },
      include: {
        investment: {
          include: {
            projectStage: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      take: 50,
    });

    return transactions;
  }

  @Get('summary')
  @UseGuards(BetterAuthGuard)
  async getHistorySummary(@Req() req: any) {
    const userId = req.user.id;

    // Get summary statistics
    const totalInvested = await this.prismaService.transaction.aggregate({
      where: {
        investment: { userId },
        type: 'PAYMENT',
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
    });

    const totalDividends = await this.prismaService.transaction.aggregate({
      where: {
        investment: { userId },
        type: 'DIVIDEND',
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
    });

    const transactionCount = await this.prismaService.transaction.count({
      where: {
        investment: { userId },
      },
    });

    return {
      totalInvested: totalInvested._sum.amount || 0,
      totalDividends: totalDividends._sum.amount || 0,
      transactionCount,
    };
  }
}
