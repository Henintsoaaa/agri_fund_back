import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  UpdateProjectStageDto,
  CreateIndividualStageDto,
} from './dto/project-stage.dto';
import { Project_stage_statut } from '@/generated/prisma/enums';

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
        stages: {
          create: data.stages.map((stage) => ({
            title: stage.title,
            description: stage.description,
            targetAmount: stage.targetAmount,
            collectedAmount: 0,
            stageOrder: stage.stageOrder,
            statut: Project_stage_statut.OPEN,
          })),
        },
      },
      include: {
        stages: true,
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
      include: {
        stages: {
          orderBy: {
            stageOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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
          orderBy: {
            stageOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  async updateProjectStage(
    stageId: string,
    data: UpdateProjectStageDto,
    userId: string,
  ) {
    // First check if the stage belongs to a project owned by the user
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: stageId },
      include: { project: true },
    });

    if (!stage) {
      throw new Error('Stage not found');
    }

    if (stage.project.ownerId !== userId) {
      throw new Error('Unauthorized to update this stage');
    }

    const updatedStage = await this.prisma.project_stage.update({
      where: { id: stageId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.targetAmount && { targetAmount: data.targetAmount }),
        ...(data.stageOrder && { stageOrder: data.stageOrder }),
        ...(data.statut && { statut: data.statut as Project_stage_statut }),
      },
    });

    return updatedStage;
  }

  async deleteProjectStage(stageId: string, userId: string) {
    // First check if the stage belongs to a project owned by the user
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: stageId },
      include: { project: true },
    });

    if (!stage) {
      throw new Error('Stage not found');
    }

    if (stage.project.ownerId !== userId) {
      throw new Error('Unauthorized to delete this stage');
    }

    // Check if this is the only stage in the project
    const stageCount = await this.prisma.project_stage.count({
      where: { projectId: stage.projectId },
    });

    if (stageCount <= 1) {
      throw new Error('Cannot delete the last stage of a project');
    }

    const deletedStage = await this.prisma.project_stage.delete({
      where: { id: stageId },
    });

    // Reorder remaining stages
    const remainingStages = await this.prisma.project_stage.findMany({
      where: { projectId: stage.projectId },
      orderBy: { stageOrder: 'asc' },
    });

    for (let i = 0; i < remainingStages.length; i++) {
      await this.prisma.project_stage.update({
        where: { id: remainingStages[i].id },
        data: { stageOrder: i + 1 },
      });
    }

    return deletedStage;
  }

  async createProjectStage(
    projectId: string,
    data: CreateIndividualStageDto,
    userId: string,
  ) {
    // Check if the project belongs to the user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    // Get the highest stage order
    const lastStage = await this.prisma.project_stage.findFirst({
      where: { projectId },
      orderBy: { stageOrder: 'desc' },
    });

    const stageOrder =
      data.stageOrder || (lastStage ? lastStage.stageOrder + 1 : 1);

    const newStage = await this.prisma.project_stage.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount,
        collectedAmount: 0,
        stageOrder,
        statut: Project_stage_statut.OPEN,
      },
    });

    return newStage;
  }

  async getProjectStageById(stageId: string, userId: string) {
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: stageId },
      include: { project: true },
    });

    if (!stage) {
      throw new Error('Stage not found');
    }

    if (stage.project.ownerId !== userId) {
      throw new Error('Unauthorized to view this stage');
    }

    return stage;
  }
}
