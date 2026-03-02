import { Module } from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [InvestmentService, PrismaService, NotificationService],
  controllers: [InvestmentController],
  exports: [InvestmentService],
})
export class InvestmentModule {}
