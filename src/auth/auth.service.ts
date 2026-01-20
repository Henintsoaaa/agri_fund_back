import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SigningDto } from './dto/signing-dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly auth: BetterAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async register(user: CreateUserDto) {
    const { name, email, password, phoneNumber, country } = user;
    const result = await this.auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    if (result.user?.id && (phoneNumber || country)) {
      await this.prisma.user.update({
        where: { id: result.user.id },
        data: {
          phoneNumber,
          country,
        },
      });
    }

    return result;
  }

  async login(user: SigningDto) {
    const { email, password } = user;

    return this.auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
  }

  async getSession(headers: Record<string, string>) {
    return this.auth.api.getSession({
      headers,
    });
  }

  async requestPasswordReset(email: string, redirectTo?: string) {
    return this.auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo,
      },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    headers: Record<string, string>,
    revokeOtherSessions = true,
  ) {
    return this.auth.api.changePassword({
      body: {
        newPassword,
        currentPassword,
        revokeOtherSessions,
      },
      headers,
    });
  }
}
