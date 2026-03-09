import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HistoryController],
})
export class HistoryModule {}
