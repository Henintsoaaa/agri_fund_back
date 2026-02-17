import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectStageService } from './project-stage.service';
import { Project_stage_statut } from '@/generated/prisma/enums';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectStageService: ProjectStageService,
  ) {}

  async createProject(data: CreateProjectDto, userId: string) {
    // 1. Créer le projet
    const project = await this.prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        statut: data.statut || 'DRAFT',
        ownerId: userId,
        image: data.image,
      },
    });

    // 2. Créer les stages si fournis
    if (data.stages?.length) {
      await this.projectStageService.createManyForProject(
        data.stages,
        project.id,
      );
    }

    // 3. Retourner le projet avec ses stages
    return this.prisma.project.findUnique({
      where: { id: project.id },
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });
  }

  async getMyProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        ownerId: userId,
        isDeleted: false,
      },
      include: {
        stages: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
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
      include: {
        stages: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
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
      include: {
        stages: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
      },
    });

    return projects;
  }

  async getPublicProjects() {
    const projects = await this.prisma.project.findMany({
      where: {
        isDeleted: false,
        statut: 'ACTIVE',
      },
      include: {
        stages: {
          where: {
            isDeleted: false,
            statut: {
              in: ['OPEN' as Project_stage_statut, 'FUNDED'],
            },
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
      },
    });

    return projects;
  }
}
