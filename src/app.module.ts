import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { InvestmentModule } from './investment/investment.module';
import { TransactionModule } from './transaction/transaction.module';
import { PaymentModule } from './payments/payment.module';
import { NotificationModule } from './notification/notification.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HistoryModule } from './history/history.module';
import { StatsModule } from './stats/stats.module';
import { ProofsModule } from './proofs/proofs.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { UploadModule } from './upload/upload.module';
import { LoggerModule } from './common/logger/logger.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    // Environment validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors, not just the first one
      },
    }),
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (1 minute)
        limit: 100, // Max requests per window (adjust as needed for dev)
      },
    ]),
    LoggerModule,
    BetterAuthModule.forRoot({ auth }),
    BetterAuthModule,
    AuthModule,
    ProjectModule,
    UserModule,
    AdminModule,
    InvestmentModule,
    TransactionModule,
    PaymentModule,
    NotificationModule,
    FavoritesModule,
    HistoryModule,
    StatsModule,
    ProofsModule,
    ReportsModule,
    SettingsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
