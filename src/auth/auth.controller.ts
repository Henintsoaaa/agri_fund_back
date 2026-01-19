import { Body, Controller, Post } from '@nestjs/common';
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
}
