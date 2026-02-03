import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { CreateUserWithDefaultPassDto } from '../auth/dto/create-user.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { deleteUser } from 'better-auth/api';
import { DeleteUserDto } from './dto/delete-user.dto';

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

  async editUser(data: EditUserDto) {
    const { id, isActive } = data;

    // Mettre à jour le statut isActive de l'utilisateur
    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        isActive: isActive,
      },
    });

    return updatedUser;
  }

  async deleteUser(data: DeleteUserDto) {
    const { id, isDeleted, isActive } = data;

    const deletedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        isDeleted: isDeleted,
        isActive: isActive,
      },
    });

    return deletedUser;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: false },
    });
    return users;
  }

  async getActiveUsers() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, isDeleted: false },
    });
    return users;
  }

  async getInactiveUsers() {
    const users = await this.prisma.user.findMany({
      where: { isActive: false, isDeleted: false },
    });
    return users;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async getDeletedUsers() {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: true },
    });
    return users;
  }

  async getProjectOwners() {
    const users = await this.prisma.user.findMany({
      where: { role: 'PROJECT_OWNER', isDeleted: false },
    });
    return users;
  }

  async getInvestors() {
    const users = await this.prisma.user.findMany({
      where: { role: 'INVESTOR', isDeleted: false },
    });
    return users;
  }

  async getActiveProjectOwners() {
    const users = await this.prisma.user.findMany({
      where: { role: 'PROJECT_OWNER', isActive: true, isDeleted: false },
    });
    return users;
  }

  async getInactiveProjectOwners() {
    const users = await this.prisma.user.findMany({
      where: { role: 'PROJECT_OWNER', isActive: false, isDeleted: false },
    });
    return users;
  }

  async getActiveInvestors() {
    const users = await this.prisma.user.findMany({
      where: { role: 'INVESTOR', isActive: true, isDeleted: false },
    });
    return users;
  }

  async getInactiveInvestors() {
    const users = await this.prisma.user.findMany({
      where: { role: 'INVESTOR', isActive: false, isDeleted: false },
    });
    return users;
  }
}
