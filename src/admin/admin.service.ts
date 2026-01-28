import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { CreateUserWithDefaultPassDto } from '../auth/dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly auth: BetterAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async createUser(data: CreateUserWithDefaultPassDto) {
    const { name, email } = data;

    // Créer l'utilisateur avec better-auth
    const result = await this.auth.api.signUpEmail({
      body: {
        name,
        email,
        password: '12345678', // Mot de passe par défaut
      },
    });

    // Mettre à jour le rôle de l'utilisateur à PROJECT_OWNER
    if (result.user?.id) {
      await this.prisma.user.update({
        where: { id: result.user.id },
        data: {
          role: 'PROJECT_OWNER',
        },
      });
    }

    return result;
  }
}
