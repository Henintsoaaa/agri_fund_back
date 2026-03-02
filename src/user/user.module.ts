import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, NotificationService],
})
export class UserModule {}
