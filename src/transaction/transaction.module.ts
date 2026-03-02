import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [TransactionService, PrismaService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
