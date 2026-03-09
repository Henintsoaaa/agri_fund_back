import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
