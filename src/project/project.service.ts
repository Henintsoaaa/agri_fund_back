import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';
import { ProjectStageService } from './project-stage.service';
import { Project_stage_statut } from '@/generated/prisma/enums';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectStageService: ProjectStageService,
    private readonly notificationService: NotificationService,
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
      include: {
        owner: {
          select: { name: true },
        },
      },
    });

    // 2. Créer les stages si fournis
    if (data.stages?.length) {
      await this.projectStageService.createManyForProject(
        data.stages,
        project.id,
      );
    }

    // 3. Send notification
    await this.notificationService.notifyProjectCreated(
      project.id,
      project.title,
      userId,
      project.owner.name,
    );

    // 4. Retourner le projet avec ses stages
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
    data: UpdateProjectDto,
    userId: string,
  ) {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.image !== undefined) updateData.image = data.image;

    const updatedProject = await this.prisma.project.update({
      where: {
        id: projectId,
        ownerId: userId,
        isDeleted: false,
      },
      data: updateData,
    });

    // Send notification
    await this.notificationService.notifyProjectUpdated(
      projectId,
      updatedProject.title,
      userId,
    );

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

    // Send notification
    await this.notificationService.notifyProjectSuspended(
      projectId,
      result.title,
      result.ownerId,
    );

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

    // Send notification
    await this.notificationService.notifyProjectActivated(
      projectId,
      result.title,
      result.ownerId,
    );

    return result;
  }

  async deleteProject(projectId: string, userId?: string, userRole?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Only allow project owner or admin to delete
    if (userRole !== 'ADMIN' && project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own projects');
    }

    const result = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        isDeleted: true,
        statut: 'SUSPENDED',
      },
    });

    // Send notification
    if (project) {
      await this.notificationService.notifyProjectDeleted(
        projectId,
        project.title,
        project.ownerId,
      );
    }

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

  async getProjectInvestors(projectId: string) {
    // Récupérer tous les investissements pour ce projet
    const investments = await this.prisma.investment.findMany({
      where: {
        projectStage: {
          projectId: projectId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
          },
        },
        projectStage: {
          select: {
            id: true,
            title: true,
            stageOrder: true,
          },
        },
      },
      orderBy: {
        investmentDate: 'desc',
      },
    });

    // Grouper les investissements par utilisateur
    const investorMap = new Map();

    investments.forEach((investment) => {
      const userId = investment.user.id;

      if (!investorMap.has(userId)) {
        investorMap.set(userId, {
          id: userId,
          name: investment.user.name,
          email: investment.user.email,
          phone: investment.user.phoneNumber,
          image: investment.user.image,
          totalInvested: 0,
          investments: [],
        });
      }

      const investor = investorMap.get(userId);
      investor.totalInvested += investment.amount;
      investor.investments.push({
        id: investment.id,
        amount: investment.amount,
        investmentDate: investment.investmentDate,
        stage: investment.projectStage.title,
        stageOrder: investment.projectStage.stageOrder,
      });
    });

    // Convertir la map en tableau et trier par montant total investi
    const investors = Array.from(investorMap.values()).sort(
      (a, b) => b.totalInvested - a.totalInvested,
    );

    return {
      projectId,
      totalInvestors: investors.length,
      totalInvested: investors.reduce(
        (sum, investor) => sum + investor.totalInvested,
        0,
      ),
      investors,
    };
  }
}
