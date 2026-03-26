import {
  Controller,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly prismaService: PrismaService) {}

  private getLastMonthsKeys(monthsCount = 6) {
    const now = new Date();
    return Array.from({ length: monthsCount }, (_, index) => {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - (monthsCount - 1 - index),
        1,
      );

      const month = String(monthDate.getMonth() + 1).padStart(2, '0');
      return `${monthDate.getFullYear()}-${month}`;
    });
  }

  private getMonthKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  }

  @Get('investor')
  @UseGuards(BetterAuthGuard)
  async getInvestorStats(@Req() req: any) {
    if (req.user.role !== 'INVESTOR') {
      throw new ForbiddenException('Only investors can access investor stats');
    }

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
    const invested = totalInvested._sum.amount || 0;
    const roi = invested > 0 ? (totalReturns / invested) * 100 : 0;

    return {
      totalInvested: invested,
      activeProjects,
      totalDividends: totalReturns,
      roi: Number(roi.toFixed(2)),
    };
  }

  @Get('admin')
  @UseGuards(BetterAuthGuard)
  async getAdminStats(@Req() req: any) {
    // Only admins should access this endpoint
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access admin stats');
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

    const monthKeys = this.getLastMonthsKeys(6);
    const firstMonthDate = new Date(`${monthKeys[0]}-01T00:00:00.000Z`);

    // Build users growth series with cumulative total per month.
    const usersBeforeRange = await this.prismaService.user.count({
      where: {
        createdAt: {
          lt: firstMonthDate,
        },
      },
    });

    const usersInRange = await this.prismaService.user.findMany({
      where: {
        createdAt: {
          gte: firstMonthDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const usersByMonth = new Map<string, number>();
    for (const monthKey of monthKeys) {
      usersByMonth.set(monthKey, 0);
    }

    for (const user of usersInRange) {
      const monthKey = this.getMonthKey(user.createdAt);
      if (usersByMonth.has(monthKey)) {
        usersByMonth.set(monthKey, (usersByMonth.get(monthKey) || 0) + 1);
      }
    }

    let runningUsers = usersBeforeRange;
    const userGrowth = monthKeys.map((monthKey) => {
      const newUsers = usersByMonth.get(monthKey) || 0;
      runningUsers += newUsers;

      return {
        month: monthKey,
        newUsers,
        totalUsers: runningUsers,
      };
    });

    // Build confirmed investments volume series by month.
    const investmentsInRange = await this.prismaService.investment.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: firstMonthDate,
        },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const volumeByMonth = new Map<string, number>();
    for (const monthKey of monthKeys) {
      volumeByMonth.set(monthKey, 0);
    }

    for (const investment of investmentsInRange) {
      const monthKey = this.getMonthKey(investment.createdAt);
      if (volumeByMonth.has(monthKey)) {
        volumeByMonth.set(
          monthKey,
          (volumeByMonth.get(monthKey) || 0) + investment.amount,
        );
      }
    }

    const investmentVolumeByMonth = monthKeys.map((monthKey) => ({
      month: monthKey,
      amount: Number((volumeByMonth.get(monthKey) || 0).toFixed(2)),
    }));

    // No category field exists yet on projects, so distribution uses project status.
    const [
      draftProjects,
      activeProjectsCount,
      completedProjects,
      suspendedProjects,
    ] = await Promise.all([
      this.prismaService.project.count({
        where: { statut: 'DRAFT', isDeleted: false },
      }),
      this.prismaService.project.count({
        where: { statut: 'ACTIVE', isDeleted: false },
      }),
      this.prismaService.project.count({
        where: { statut: 'COMPLETED', isDeleted: false },
      }),
      this.prismaService.project.count({
        where: { statut: 'SUSPENDED', isDeleted: false },
      }),
    ]);

    const projectDistribution = [
      { label: 'Brouillon', value: draftProjects },
      { label: 'Actif', value: activeProjectsCount },
      { label: 'Termine', value: completedProjects },
      { label: 'Suspendu', value: suspendedProjects },
    ];

    return {
      totalUsers,
      activeProjects,
      totalVolume: totalVolume._sum.amount || 0,
      successRate: Number(successRate),
      fundedProjects,
      userGrowth,
      investmentVolumeByMonth,
      projectDistribution,
    };
  }
}
