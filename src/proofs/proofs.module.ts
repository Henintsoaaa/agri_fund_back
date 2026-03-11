import { Module } from '@nestjs/common';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProofsController],
  providers: [ProofsService, NotificationService],
  exports: [ProofsService],
})
export class ProofsModule {}
