import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [TransactionService, PrismaService, NotificationService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
