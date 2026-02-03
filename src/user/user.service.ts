import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';

@Injectable()
export class UserService {}
