import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/CreateInvestment.dto';
import {
  InvestmentStatus,
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/enums';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class InvestmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Crée un investissement PENDING et la transaction correspondante PENDING.
   * Vérifie stage ouvert, plafond, montant valide.
   */
  async createInvestment(investmentData: CreateInvestmentDto) {
    const { amount, projectStageId, userId } = investmentData;

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    return await this.prisma.$transaction(async (tx) => {
      const stage = await tx.project_stage.findUnique({
        where: { id: projectStageId, isDeleted: false },
      });

      if (!stage) {
        throw new NotFoundException('Stage introuvable');
      }

      if (stage.statut !== 'OPEN') {
        throw new BadRequestException(
          "Le stage n'est pas ouvert aux investissements",
        );
      }

      if (stage.currentAmount + amount > stage.targetAmount) {
        throw new BadRequestException(
          `Le montant dépasse l'objectif. Montant disponible: ${stage.targetAmount - stage.currentAmount}`,
        );
      }

      // Créer l'investissement avec status PENDING
      const investment = await tx.investment.create({
        data: {
          amount,
          projectStageId,
          userId,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  title: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      });

      // Créer la transaction PAYMENT PENDING
      await tx.transaction.create({
        data: {
          investmentId: investment.id,
          amount,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.PENDING,
          provider: investmentData.provider || 'STRIPE',
        },
      });

      // Send notification
      await this.notificationService.notifyInvestmentCreated(
        investment.id,
        investment.user.id,
        investment.user.name,
        amount,
        investment.projectStage.id,
        investment.projectStage.title,
        investment.projectStage.project.id,
        investment.projectStage.project.title,
        investment.projectStage.project.ownerId,
        tx,
      );

      return investment;
    });
  }

  /**
   * Confirme un investissement après validation du paiement (status CONFIRMED).
   * Met à jour stage.currentAmount.
   */
  async confirmInvestment(investmentId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: {
          projectStage: true,
        },
      });

      if (!investment) {
        throw new NotFoundException('Investissement introuvable');
      }

      if (investment.status !== 'PENDING') {
        throw new BadRequestException(
          `L'investissement ne peut pas être confirmé (status: ${investment.status})`,
        );
      }

      // Mettre à jour l'investissement
      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'CONFIRMED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              title: true,
              targetAmount: true,
              currentAmount: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  title: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      });

      // Mettre à jour le montant collecté du stage
      await tx.project_stage.update({
        where: { id: investment.projectStageId },
        data: {
          currentAmount: {
            increment: investment.amount,
          },
        },
      });

      // Mettre à jour la transaction
      await tx.transaction.updateMany({
        where: { investmentId, type: TransactionType.PAYMENT },
        data: {
          status: TransactionStatus.SUCCESS,
        },
      });

      // Vérifier si le stage est complètement financé
      const updatedStage = await tx.project_stage.findUnique({
        where: { id: investment.projectStageId },
      });

      if (
        updatedStage &&
        updatedStage.currentAmount >= updatedStage.targetAmount
      ) {
        // Marquer le stage comme FUNDED
        await tx.project_stage.update({
          where: { id: investment.projectStageId },
          data: {
            statut: 'FUNDED',
          },
        });

        // Ouvrir automatiquement le stage suivant (stageOrder + 1)
        const nextStage = await tx.project_stage.findFirst({
          where: {
            projectId: updatedStage.projectId,
            stageOrder: updatedStage.stageOrder + 1,
            isDeleted: false,
          },
        });

        if (nextStage && nextStage.statut === 'CLOSED') {
          await tx.project_stage.update({
            where: { id: nextStage.id },
            data: {
              statut: 'OPEN',
            },
          });
        }

        // Notify stage funded
        await this.notificationService.notifyProjectStageFunded(
          updatedInvestment.projectStage.id,
          updatedInvestment.projectStage.project.id,
          updatedInvestment.projectStage.title,
          updatedInvestment.projectStage.project.title,
          updatedInvestment.projectStage.project.ownerId,
        );
      }

      // Send investment confirmed notification
      await this.notificationService.notifyInvestmentConfirmed(
        updatedInvestment.id,
        updatedInvestment.user.id,
        updatedInvestment.user.name,
        investment.amount,
        updatedInvestment.projectStage.id,
        updatedInvestment.projectStage.title,
        updatedInvestment.projectStage.project.id,
        updatedInvestment.projectStage.project.title,
        updatedInvestment.projectStage.project.ownerId,
      );

      return updatedInvestment;
    });
  }

  /**
   * Annule un investissement, déclenche un remboursement si nécessaire,
   * met status = CANCELLED.
   */
  async cancelInvestment(investmentId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: {
          projectStage: true,
        },
      });

      if (!investment) {
        throw new NotFoundException('Investissement introuvable');
      }

      if (investment.status === 'CANCELLED') {
        throw new BadRequestException("L'investissement est déjà annulé");
      }

      // Si l'investissement était confirmé, décrémenter currentAmount
      if (investment.status === 'CONFIRMED') {
        await tx.project_stage.update({
          where: { id: investment.projectStageId },
          data: {
            currentAmount: {
              decrement: investment.amount,
            },
          },
        });
      }

      // Mettre à jour l'investissement
      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  title: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      });

      // Mettre à jour les transactions
      await tx.transaction.updateMany({
        where: { investmentId, type: TransactionType.PAYMENT },
        data: {
          status: TransactionStatus.FAILED,
        },
      });

      // Send notification
      await this.notificationService.notifyInvestmentCancelled(
        updatedInvestment.id,
        updatedInvestment.user.id,
        updatedInvestment.user.name,
        investment.amount,
        updatedInvestment.projectStage.id,
        updatedInvestment.projectStage.title,
        updatedInvestment.projectStage.project.id,
        updatedInvestment.projectStage.project.title,
        updatedInvestment.projectStage.project.ownerId,
      );

      return updatedInvestment;
    });
  }

  /**
   * Retourne tous les investissements d'un investisseur (pour dashboard).
   */
  async getInvestorInvestments(investorId: string) {
    return await this.prisma.investment.findMany({
      where: {
        userId: investorId,
      },
      include: {
        projectStage: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                image: true,
              },
            },
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            status: true,
            provider: true,
            transactionDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retourne tous les investissements d'un stage (pour porteur).
   */
  async getStageInvestments(stageId: string) {
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: stageId, isDeleted: false },
    });

    if (!stage) {
      throw new NotFoundException('Stage introuvable');
    }

    return await this.prisma.investment.findMany({
      where: {
        projectStageId: stageId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            status: true,
            provider: true,
            transactionDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Optionnel : calcule le retour sur investissement basé sur DIVIDEND et paiements.
   * Note: Nécessite une table DIVIDEND pour un calcul réel.
   */
  async calculateROI(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: {
        userId: investorId,
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        amount: true,
        projectStage: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Pour l'instant, retourne les données basiques
    // À compléter avec une vraie logique de dividendes
    return {
      investorId,
      totalInvested,
      totalInvestments: investments.length,
      investments: investments.map((inv) => ({
        investmentId: inv.id,
        amount: inv.amount,
        projectTitle: inv.projectStage.project.title,
        stageTitle: inv.projectStage.title,
        // dividendsReceived: 0, // À implémenter avec table DIVIDEND
        // roi: 0, // À calculer
      })),
    };
  }

  /**
   * Statistiques : total investi, nombre d'investisseurs, progression du stage.
   */
  async getInvestmentStats(stageId: string) {
    const stage = await this.prisma.project_stage.findUnique({
      where: { id: stageId, isDeleted: false },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage introuvable');
    }

    const investments = await this.prisma.investment.findMany({
      where: {
        projectStageId: stageId,
      },
    });

    const confirmedInvestments = investments.filter(
      (inv) => inv.status === 'CONFIRMED',
    );

    const totalInvested = confirmedInvestments.reduce(
      (sum, inv) => sum + inv.amount,
      0,
    );

    const uniqueInvestors = new Set(
      confirmedInvestments.map((inv) => inv.userId),
    ).size;

    const progressPercentage =
      stage.targetAmount > 0
        ? Math.round((stage.currentAmount / stage.targetAmount) * 100)
        : 0;

    return {
      stageId: stage.id,
      stageTitle: stage.title,
      projectTitle: stage.project.title,
      targetAmount: stage.targetAmount,
      currentAmount: stage.currentAmount,
      totalInvested,
      remainingAmount: Math.max(0, stage.targetAmount - stage.currentAmount),
      progressPercentage,
      totalInvestments: investments.length,
      confirmedInvestments: confirmedInvestments.length,
      pendingInvestments: investments.filter((inv) => inv.status === 'PENDING')
        .length,
      uniqueInvestors,
      status: stage.statut,
    };
  }

  /**
   * Change le status si nécessaire (PENDING → CONFIRMED/FAILED).
   */
  async updateInvestmentStatus(investmentId: string, status: InvestmentStatus) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investissement introuvable');
    }

    // Utiliser les méthodes dédiées pour CONFIRMED et CANCELLED
    if (status === 'CONFIRMED') {
      return await this.confirmInvestment(investmentId);
    }

    if (status === 'CANCELLED') {
      return await this.cancelInvestment(investmentId);
    }

    // Pour FAILED ou autres status
    return await this.prisma.$transaction(async (tx) => {
      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: { status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      // Mettre à jour les transactions associées (seulement pour FAILED ou PENDING)
      await tx.transaction.updateMany({
        where: { investmentId, type: TransactionType.PAYMENT },
        data: { status: TransactionStatus.FAILED },
      });

      // Send notification for failed investment
      if (status === 'FAILED') {
        await this.notificationService.notifyInvestmentFailed(
          updatedInvestment.id,
          updatedInvestment.user.id,
          investment.amount,
          updatedInvestment.projectStage.id,
          updatedInvestment.projectStage.title,
          updatedInvestment.projectStage.project.id,
          updatedInvestment.projectStage.project.title,
        );
      }

      return updatedInvestment;
    });
  }
}
