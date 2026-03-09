import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('investor')
  @UseGuards(BetterAuthGuard)
  async getInvestorStats(@Req() req: any) {
    const userId = req.user.id;

    // Total portfolio value
    const totalInvested = await this.prismaService.investment.aggregate({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      _sum: {
        amount: true,
      },
    });

    // Active projects count
    const investments = await this.prismaService.investment.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
      },
      distinct: ['projectStageId'],
      select: {
        projectStageId: true,
      },
    });
    const activeProjects = investments.length;

    // Total dividends
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

    // Calculate ROI (simplified)
    const totalReturns = totalDividends._sum.amount || 0;
    const invested = totalInvested._sum.amount || 1;
    const roi = ((totalReturns / invested) * 100).toFixed(2);

    return {
      totalInvested: invested,
      activeProjects,
      totalDividends: totalReturns,
      roi: parseFloat(roi),
    };
  }

  @Get('admin')
  @UseGuards(BetterAuthGuard)
  async getAdminStats(@Req() req: any) {
    // Only admins should access this
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Total users
    const totalUsers = await this.prismaService.user.count();

    // Active projects
    const activeProjects = await this.prismaService.project.count({
      where: {
        statut: 'ACTIVE',
        isDeleted: false,
      },
    });

    // Total investment volume
    const totalVolume = await this.prismaService.investment.aggregate({
      where: {
        status: 'CONFIRMED',
      },
      _sum: {
        amount: true,
      },
    });

    // Funded projects
    const fundedProjects = await this.prismaService.project_stage.count({
      where: {
        statut: 'FUNDED',
      },
    });

    const totalProjects = await this.prismaService.project.count({
      where: {
        isDeleted: false,
      },
    });

    const successRate =
      totalProjects > 0
        ? ((fundedProjects / totalProjects) * 100).toFixed(1)
        : 0;

    return {
      totalUsers,
      activeProjects,
      totalVolume: totalVolume._sum.amount || 0,
      successRate: parseFloat(successRate.toString()),
      fundedProjects,
    };
  }
}
