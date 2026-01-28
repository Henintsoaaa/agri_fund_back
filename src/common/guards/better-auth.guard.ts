// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';

// @Injectable()
// export class BetterAuthGuard implements CanActivate {
//   constructor(private readonly auth: BetterAuthService) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();

//     console.log('HEADERS:', request.headers);
//     console.log('COOKIES:', request.cookies);

//     const session = await this.auth.api.getSession({
//       headers: {
//         cookie: request.headers.cookie,
//       },
//     });

//     if (!session?.user) {
//       throw new UnauthorizedException();
//     }

//     request.user = session.user;
//     return true;
//   }
// }

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '@/src/lib/auth'; // <- important : la même instance
import { PrismaService } from '@/src/prisma/prisma.service';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Récupérer la session
    const session = await auth.api.getSession({
      headers: {
        cookie: request.headers.cookie,
      },
    });

    if (!session?.user) {
      throw new UnauthorizedException('No valid session found');
    }

    // Récupérer l'utilisateur complet depuis la base de données pour avoir le rôle
    const fullUser = await this.prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    // Attacher l'utilisateur complet avec le rôle
    request.user = fullUser;
    return true;
  }
}
