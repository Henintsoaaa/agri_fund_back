import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    BetterAuthGuard,
    RolesGuard,
    NotificationService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
