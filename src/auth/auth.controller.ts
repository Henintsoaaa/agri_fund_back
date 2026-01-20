import { Body, Controller, Post, Headers, Get, Param } from '@nestjs/common';
import { auth } from '../lib/auth';
import { AuthService } from './auth.service';
import {
  Session,
  UserSession,
  AllowAnonymous,
  OptionalAuth,
} from '@thallesp/nestjs-better-auth';
import { CreateUserDto } from './dto/create-user.dto';
import { SigningDto } from './dto/signing-dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-passsword.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @AllowAnonymous()
  register(@Body() user: CreateUserDto) {
    return this.authService.register(user);
  }

  @Post('login')
  @AllowAnonymous()
  login(@Body() user: SigningDto) {
    return this.authService.login(user);
  }

  @Post('request-password-reset')
  @AllowAnonymous()
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email, dto.redirectTo);
  }

  @Post('reset-password/:token')
  @AllowAnonymous()
  resetPassword(@Body() dto: ResetPasswordDto, @Param('token') token: string) {
    return this.authService.resetPassword(token, dto.newPassword);
  }

  @Post('change-password')
  @AllowAnonymous()
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.authService.changePassword(
      dto.currentPassword,
      dto.newPassword,
      headers,
      dto.revokeOtherSessions,
    );
  }

  @Post('logout')
  @AllowAnonymous()
  logout(@Headers() headers: Record<string, string>) {
    return this.authService.logout(headers);
  }
}
