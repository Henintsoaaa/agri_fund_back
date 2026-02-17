import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectStageDto } from './dto/create-project-stage.dto';
import { Project_stage_statut } from '@/generated/prisma/enums';
import {
  DeleteProjectStageDto,
  UpdateProjectStageDto,
} from './dto/update-project-stage.dto';

@Injectable()
export class ProjectStageService {
  constructor(private readonly prisma: PrismaService) {}

  async createManyForProject(
    stages: CreateProjectStageDto[],
    projectId: string,
  ) {
    const stageData = stages.map((stage) => ({
      title: stage.title,
      description: stage.description,
      stageOrder: stage.stageOrder,
      targetAmount: stage.targetAmount,
      image: stage.image,
      projectId,
      statut:
        stage.stageOrder === 1 ? 'OPEN' : ('CLOSED' as Project_stage_statut),
    }));

    return this.prisma.project_stage.createMany({
      data: stageData,
    });
  }

  async updateOneProjectStage(
    data: UpdateProjectStageDto,
    projectStageId: string,
  ) {
    const project = this.prisma.project_stage.update({
      where: {
        id: projectStageId,
      },
      data: {
        title: data.title,
        description: data.description,
      },
    });

    return project;
  }

  async deleteProjectStage(
    data: DeleteProjectStageDto,
    projectStageId: string,
  ) {
    // 1. Get the stage to be deleted
    const stageToDelete = await this.prisma.project_stage.findUnique({
      where: { id: projectStageId },
    });

    if (!stageToDelete) {
      throw new Error('Stage not found');
    }

    // 2. Find the next stage (stageOrder + 1)
    const nextStage = await this.prisma.project_stage.findFirst({
      where: {
        projectId: stageToDelete.projectId,
        stageOrder: stageToDelete.stageOrder + 1,
        isDeleted: false,
      },
    });

    // 3. Use transaction to update both stages atomically
    const result = await this.prisma.$transaction(async (prisma) => {
      // Mark current stage as deleted
      const deletedStage = await prisma.project_stage.update({
        where: { id: projectStageId },
        data: { isDeleted: data.isDeleted },
      });

      // If there's a next stage, update its order and status
      if (nextStage) {
        await prisma.project_stage.update({
          where: { id: nextStage.id },
          data: {
            stageOrder: stageToDelete.stageOrder,
            statut: 'OPEN' as Project_stage_statut,
          },
        });
      }

      return deletedStage;
    });

    return result;
  }

  async getAllProjectStageOfProject(projectId: string) {
    return this.prisma.project_stage.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: {
        stageOrder: 'asc',
      },
    });
  }

  async countProjectStages(projectId: string) {
    const total = await this.prisma.project_stage.count({
      where: {
        projectId,
        isDeleted: false,
      },
    });

    const byStatus = await this.prisma.project_stage.groupBy({
      by: ['statut'],
      where: {
        projectId,
        isDeleted: false,
      },
      _count: {
        id: true,
      },
    });

    return {
      total,
      open: byStatus.find((s) => s.statut === 'OPEN')?._count.id || 0,
      funded: byStatus.find((s) => s.statut === 'FUNDED')?._count.id || 0,
      closed: byStatus.find((s) => s.statut === 'CLOSED')?._count.id || 0,
    };
  }
}
