import { Module } from '@nestjs/common';
import { PaymentController, WebhookController } from './payment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionModule } from '../transaction/transaction.module';
import { InvestmentModule } from '../investment/investment.module';
import { PaymentService } from './payment.service';

@Module({
  imports: [TransactionModule, InvestmentModule],
  providers: [PaymentService, PrismaService],
  controllers: [PaymentController, WebhookController],
  exports: [PaymentService],
})
export class PaymentModule {}
