import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('generate')
  @UseGuards(BetterAuthGuard)
  async generateReport(
    @Query('type') type: string,
    @Query('period') period: string,
    @Req() req: any,
  ) {
    // Only admins should access this
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const now = new Date();
    let startDate = new Date();

    // Calculate date range based on period
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    let data: any = {};

    switch (type) {
      case 'users':
        data = await this.getUsersReport(startDate);
        break;
      case 'investments':
        data = await this.getInvestmentsReport(startDate);
        break;
      case 'transactions':
        data = await this.getTransactionsReport(startDate);
        break;
      case 'projects':
        data = await this.getProjectsReport(startDate);
        break;
      default:
        data = { message: 'Invalid report type' };
    }

    return {
      type,
      period,
      startDate,
      endDate: now,
      data,
      generatedAt: now,
    };
  }

  private async getUsersReport(startDate: Date) {
    const newUsers = await this.prismaService.user.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const totalUsers = await this.prismaService.user.count();

    const usersByRole = await this.prismaService.user.groupBy({
      by: ['role'],
      _count: true,
    });

    return {
      newUsers,
      totalUsers,
      usersByRole,
    };
  }

  private async getInvestmentsReport(startDate: Date) {
    const investments = await this.prismaService.investment.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        projectStage: {
          include: {
            project: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const totalAmount = await this.prismaService.investment.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: 'CONFIRMED',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      investments,
      totalAmount: totalAmount._sum.amount || 0,
      count: investments.length,
    };
  }

  private async getTransactionsReport(startDate: Date) {
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        transactionDate: { gte: startDate },
      },
      include: {
        investment: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const totalAmount = await this.prismaService.transaction.aggregate({
      where: {
        transactionDate: { gte: startDate },
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      transactions,
      totalAmount: totalAmount._sum.amount || 0,
      count: transactions.length,
    };
  }

  private async getProjectsReport(startDate: Date) {
    const projects = await this.prismaService.project.findMany({
      where: {
        createdAt: { gte: startDate },
        isDeleted: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        stages: {
          select: {
            statut: true,
            targetAmount: true,
            currentAmount: true,
          },
        },
      },
    });

    const projectsByStatus = await this.prismaService.project.groupBy({
      where: {
        createdAt: { gte: startDate },
        isDeleted: false,
      },
      by: ['statut'],
      _count: true,
    });

    return {
      projects,
      projectsByStatus,
      count: projects.length,
    };
  }

  @Get('list')
  @UseGuards(BetterAuthGuard)
  async listReports(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Return mock list for now - in production, save reports to database
    const now = new Date();
    return [
      {
        id: '1',
        name: 'Users Report - Last Month',
        type: 'users',
        period: 'month',
        generatedAt: new Date(now.getTime() - 86400000),
        size: '2.5 MB',
      },
      {
        id: '2',
        name: 'Investments Report - Last Quarter',
        type: 'investments',
        period: 'quarter',
        generatedAt: new Date(now.getTime() - 172800000),
        size: '5.1 MB',
      },
    ];
  }
}
