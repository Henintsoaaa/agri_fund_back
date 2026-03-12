import { Module } from '@nestjs/common';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ProofsController],
  providers: [ProofsService, NotificationService],
  exports: [ProofsService],
})
export class ProofsModule {}
