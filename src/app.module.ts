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

@Module({
  imports: [
    BetterAuthModule.forRoot({ auth }),
    BetterAuthModule,
    AuthModule,
    ProjectModule,
    UserModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
