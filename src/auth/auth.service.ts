import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  CreateUserWithDefaultPassDto,
} from './dto/create-user.dto';
import { SigningDto } from './dto/signing-dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly auth: BetterAuthService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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

    if (result.user?.id) {
      if (phoneNumber || country) {
        await this.prisma.user.update({
          where: { id: result.user.id },
          data: {
            phoneNumber,
            country,
          },
        });
      }

      // Send welcome notification
      await this.notificationService.notifyUserSignup(result.user.id, name);
    }

    return result;
  }

  async login(user: SigningDto, res: any) {
    const { email, password } = user;

    // Appeler better-auth handler directement
    const betterAuthResponse = await this.auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: true, // Demander la réponse HTTP complète
    });

    // Extraire les cookies de la réponse better-auth
    const setCookieHeader = betterAuthResponse.headers.get('set-cookie');
    let sessionToken: string | null = null;

    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);

      // Extraire le token signé complet du cookie
      const tokenMatch = setCookieHeader.match(
        /better-auth\.session_token=([^;]+)/,
      );
      if (tokenMatch) {
        sessionToken = decodeURIComponent(tokenMatch[1]);
      }
    }

    const responseData = await betterAuthResponse.json();

    // Récupérer l'utilisateur complet depuis la base
    const responseUser = await this.prisma.user.findUnique({
      where: { id: responseData.user.id },
    });

    return {
      ...responseData,
      user: responseUser,
      sessionToken, // Token complet signé (pour usage manuel si nécessaire)
    };
  }

  async getSession(headers: Record<string, string>) {
    const session = await this.auth.api.getSession({
      headers,
    });

    // Si une session existe, enrichir avec les données complètes de l'utilisateur
    if (session?.user?.id) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: session.user.id },
      });

      return {
        ...session,
        user: fullUser,
      };
    }

    return session;
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

  async logout(headers: Record<string, string>) {
    try {
      return await this.auth.api.signOut({
        headers,
      });
    } catch (error) {
      // Si la session n'existe pas (P2025), on retourne success quand même
      // car l'utilisateur est déjà déconnecté
      if (error.code === 'P2025') {
        return { success: true };
      }
      throw error;
    }
  }
}
