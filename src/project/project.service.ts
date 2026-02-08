import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(data: CreateProjectDto, userId: string) {
    const result = await this.prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        statut: data.statut || 'DRAFT',
        ownerId: userId,
      },
    });

    return result;
  }

  async getMyProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        ownerId: userId,
        isDeleted: false,
      },
    });

    return projects;
  }

  async getProjectById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    return project;
  }

  async updateProject(
    projectId: string,
    data: CreateProjectDto,
    userId: string,
  ) {
    const updatedProject = await this.prisma.project.update({
      where: {
        id: projectId,
        ownerId: userId,
        isDeleted: false,
      },
      data: {
        title: data.title,
        description: data.description,
        statut: data.statut,
      },
    });

    return updatedProject;
  }

  async suspendProject(projectId: string) {
    const result = await this.prisma.project.update({
      where: {
        id: projectId,
        isDeleted: false,
      },
      data: {
        statut: 'SUSPENDED',
      },
    });

    return result;
  }

  async activateProject(projectId: string) {
    const result = await this.prisma.project.update({
      where: {
        id: projectId,
        isDeleted: false,
      },
      data: {
        statut: 'ACTIVE',
      },
    });

    return result;
  }

  async deleteProject(projectId: string) {
    const result = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        isDeleted: true,
        statut: 'SUSPENDED',
      },
    });

    return result;
  }

  async getAllProjects() {
    const projects = await this.prisma.project.findMany({
      where: {
        isDeleted: false,
      },
    });

    return projects;
  }
}
