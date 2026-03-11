import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProofStatus } from '@/generated/prisma/enums';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProofsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new proof for a project or stage
   */
  async createProof(data: {
    projectId: string;
    projectStageId?: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    uploadedBy: string;
  }) {
    const { projectId, projectStageId, uploadedBy, ...proofData } = data;

    // Verify user owns the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: uploadedBy,
        isDeleted: false,
      },
    });

    if (!project) {
      throw new ForbiddenException(
        'Project not found or you are not authorized',
      );
    }

    // If projectStageId is provided, verify it belongs to the project
    if (projectStageId) {
      const stage = await this.prisma.project_stage.findFirst({
        where: {
          id: projectStageId,
          projectId,
          isDeleted: false,
        },
      });

      if (!stage) {
        throw new NotFoundException('Project stage not found');
      }
    }

    const proof = await this.prisma.proof.create({
      data: {
        projectId,
        projectStageId,
        ...proofData,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        projectStage: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return proof;
  }

  /**
   * Get proofs for a project owner
   */
  async getMyProofs(userId: string) {
    return await this.prisma.proof.findMany({
      where: {
        project: {
          ownerId: userId,
          isDeleted: false,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
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
        uploadedAt: 'desc',
      },
    });
  }

  /**
   * Get approved proofs for a specific project stage (visible to all users)
   */
  async getStageProofs(projectStageId: string) {
    // First, check if stage is funded
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: projectStageId },
    });

    if (!stage) {
      throw new NotFoundException('Project stage not found');
    }

    // Only return proofs if stage is FUNDED or CLOSED
    if (stage.statut !== 'FUNDED' && stage.statut !== 'CLOSED') {
      return [];
    }

    return await this.prisma.proof.findMany({
      where: {
        projectStageId,
        status: ProofStatus.APPROVED,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  /**
   * Get all approved proofs for a project (visible to all users)
   */
  async getProjectProofs(projectId: string) {
    return await this.prisma.proof.findMany({
      where: {
        projectId,
        status: ProofStatus.APPROVED,
        OR: [
          {
            projectStage: {
              statut: { in: ['FUNDED', 'CLOSED'] },
            },
          },
          {
            projectStageId: null, // General project proofs
          },
        ],
      },
      include: {
        projectStage: {
          select: {
            id: true,
            title: true,
            stageOrder: true,
            statut: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  /**
   * Admin: Approve a proof
   */
  async approveProof(proofId: string, adminId: string) {
    const proof = await this.prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        project: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!proof) {
      throw new NotFoundException('Proof not found');
    }

    const updatedProof = await this.prisma.proof.update({
      where: { id: proofId },
      data: {
        status: ProofStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    // Notify project owner
    await this.notificationService.createNotification({
      userId: proof.project.ownerId,
      content: `Votre preuve "${proof.title}" a été approuvée.`,
    });

    return updatedProof;
  }

  /**
   * Admin: Reject a proof
   */
  async rejectProof(proofId: string, adminId: string) {
    const proof = await this.prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        project: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!proof) {
      throw new NotFoundException('Proof not found');
    }

    const updatedProof = await this.prisma.proof.update({
      where: { id: proofId },
      data: {
        status: ProofStatus.REJECTED,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    // Notify project owner
    await this.notificationService.createNotification({
      userId: proof.project.ownerId,
      content: `Votre preuve "${proof.title}" a été rejetée.`,
    });

    return updatedProof;
  }

  /**
   * Admin: Get all proofs pending approval
   */
  async getPendingProofs() {
    return await this.prisma.proof.findMany({
      where: {
        status: ProofStatus.PENDING,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
        uploadedAt: 'desc',
      },
    });
  }

  /**
   * Delete a proof (only by owner before approval)
   */
  async deleteProof(proofId: string, userId: string) {
    const proof = await this.prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        project: true,
      },
    });

    if (!proof) {
      throw new NotFoundException('Proof not found');
    }

    if (proof.project.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to delete this proof');
    }

    if (proof.status === ProofStatus.APPROVED) {
      throw new BadRequestException('Cannot delete approved proof');
    }

    await this.prisma.proof.delete({
      where: { id: proofId },
    });

    return { message: 'Proof deleted successfully' };
  }
}
