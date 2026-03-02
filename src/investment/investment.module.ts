import { Module } from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [InvestmentService, PrismaService],
  controllers: [InvestmentController],
  exports: [InvestmentService],
})
export class InvestmentModule {}
