import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/CreateTransaction.dto';
import { TransactionStatus, TransactionType } from '@/generated/prisma/enums';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une transaction (type PAYMENT, REFUND, DIVIDEND) avec status PENDING.
   */
  async createTransaction(transactionData: CreateTransactionDto) {
    const { investmentId, amount, type, provider } = transactionData;

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    // Vérifier que l'investissement existe
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investissement introuvable');
    }

    return await this.prisma.transaction.create({
      data: {
        investmentId,
        amount,
        type: type || TransactionType.PAYMENT,
        provider: provider || 'STRIPE',
        status: TransactionStatus.PENDING,
      },
      include: {
        investment: {
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
              },
            },
          },
        },
      },
    });
  }

  /**
   * Met à jour status (SUCCESS, FAILED) via webhook ou refund.
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        investment: {
          include: {
            projectStage: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    // Si c'est une transaction PAYMENT qui passe à SUCCESS,
    // il faut confirmer l'investissement
    if (
      transaction.type === TransactionType.PAYMENT &&
      status === TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.SUCCESS
    ) {
      return await this.prisma.$transaction(async (tx) => {
        // Mettre à jour la transaction
        const updatedTransaction = await tx.transaction.update({
          where: { id: transactionId },
          data: { status },
          include: {
            investment: {
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
                  },
                },
              },
            },
          },
        });

        // Confirmer l'investissement si pas déjà confirmé
        if (transaction.investment.status !== 'CONFIRMED') {
          await tx.investment.update({
            where: { id: transaction.investmentId },
            data: { status: 'CONFIRMED' },
          });

          // Incrémenter currentAmount du stage
          await tx.project_stage.update({
            where: { id: transaction.investment.projectStageId },
            data: {
              currentAmount: {
                increment: transaction.amount,
              },
            },
          });

          // Vérifier si le stage est complètement financé
          const updatedStage = await tx.project_stage.findUnique({
            where: { id: transaction.investment.projectStageId },
          });

          if (
            updatedStage &&
            updatedStage.currentAmount >= updatedStage.targetAmount
          ) {
            await tx.project_stage.update({
              where: { id: transaction.investment.projectStageId },
              data: { statut: 'FUNDED' },
            });
          }
        }

        return updatedTransaction;
      });
    }

    // Pour les autres cas, simple mise à jour
    return await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status },
      include: {
        investment: {
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
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retourne toutes les transactions liées à un investissement.
   */
  async getTransactionsByInvestment(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investissement introuvable');
    }

    return await this.prisma.transaction.findMany({
      where: { investmentId },
      include: {
        investment: {
          select: {
            id: true,
            amount: true,
            status: true,
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retourne toutes les transactions d'un investisseur pour le dashboard.
   */
  async getUserTransactions(userId: string) {
    return await this.prisma.transaction.findMany({
      where: {
        investment: {
          userId,
        },
      },
      include: {
        investment: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Crée une transaction REFUND pour un investissement annulé ou remboursé.
   */
  async createRefundTransaction(
    investmentId: string,
    amount: number,
    provider?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        transaction: true,
      },
    });

    if (!investment) {
      throw new NotFoundException('Investissement introuvable');
    }

    // Vérifier qu'il existe une transaction PAYMENT SUCCESS
    const paymentTransaction = investment.transaction.find(
      (t) =>
        t.type === TransactionType.PAYMENT &&
        t.status === TransactionStatus.SUCCESS,
    );

    if (!paymentTransaction) {
      throw new BadRequestException(
        'Aucune transaction de paiement réussie trouvée pour cet investissement',
      );
    }

    // Vérifier que le montant du remboursement ne dépasse pas le montant payé
    if (amount > paymentTransaction.amount) {
      throw new BadRequestException(
        'Le montant du remboursement ne peut pas dépasser le montant payé',
      );
    }

    return await this.prisma.transaction.create({
      data: {
        investmentId,
        amount,
        type: TransactionType.REFUND,
        provider: provider || paymentTransaction.provider,
        status: TransactionStatus.PENDING,
      },
      include: {
        investment: {
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
              },
            },
          },
        },
      },
    });
  }

  /**
   * Somme des PAYMENT SUCCESS pour un investisseur.
   */
  async calculateTotalInvested(userId: string) {
    const result = await this.prisma.transaction.aggregate({
      where: {
        investment: {
          userId,
        },
        type: TransactionType.PAYMENT,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      userId,
      totalInvested: result._sum.amount || 0,
      totalTransactions: result._count,
    };
  }

  /**
   * Somme des REFUND SUCCESS.
   */
  async calculateTotalRefunded(userId: string) {
    const result = await this.prisma.transaction.aggregate({
      where: {
        investment: {
          userId,
        },
        type: TransactionType.REFUND,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      userId,
      totalRefunded: result._sum.amount || 0,
      totalRefunds: result._count,
    };
  }

  /**
   * Somme des DIVIDEND SUCCESS pour un investisseur.
   */
  async calculateDividends(userId: string) {
    const result = await this.prisma.transaction.aggregate({
      where: {
        investment: {
          userId,
        },
        type: TransactionType.DIVIDEND,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Détails des dividendes par projet
    const dividendsByProject = await this.prisma.transaction.groupBy({
      by: ['investmentId'],
      where: {
        investment: {
          userId,
        },
        type: TransactionType.DIVIDEND,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    });

    const detailedDividends = await Promise.all(
      dividendsByProject.map(async (item) => {
        const investment = await this.prisma.investment.findUnique({
          where: { id: item.investmentId },
          include: {
            projectStage: {
              include: {
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

        return {
          investmentId: item.investmentId,
          projectId: investment?.projectStage.project.id,
          projectTitle: investment?.projectStage.project.title,
          stageTitle: investment?.projectStage.title,
          totalDividends: item._sum.amount || 0,
        };
      }),
    );

    return {
      userId,
      totalDividends: result._sum.amount || 0,
      totalDividendTransactions: result._count,
      dividendsByProject: detailedDividends,
    };
  }
}
