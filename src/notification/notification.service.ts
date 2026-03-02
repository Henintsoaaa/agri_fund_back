import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

interface NotificationData {
  userId: string;
  type: string;
  content: string;
  projectId?: string;
  projectStageId?: string;
  investmentId?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createNotification(data: CreateNotificationDto) {
    return this.prismaService.notification.create({
      data: {
        userId: data.userId,
        content: data.content,
        type: 'GENERAL',
      },
    });
  }

  /**
   * Create a notification for a specific user
   */
  private async notify(data: NotificationData) {
    return this.prismaService.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        content: data.content,
        projectId: data.projectId,
        projectStageId: data.projectStageId,
        investmentId: data.investmentId,
        status: 'UNREAD',
      },
    });
  }

  /**
   * Get all admins to notify them
   */
  private async getAdmins() {
    return this.prismaService.user.findMany({
      where: { role: 'ADMIN', isActive: true, isDeleted: false },
      select: { id: true, name: true, email: true },
    });
  }

  // =================== USER EVENTS ===================

  async notifyUserSignup(userId: string, userName: string) {
    const admins = await this.getAdmins();

    // Notify user (welcome message)
    await this.notify({
      userId,
      type: 'USER_SIGNUP',
      content: `Bienvenue ${userName} ! Votre compte a été créé avec succès.`,
    });

    // Notify all admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'USER_SIGNUP',
        content: `Nouveau utilisateur inscrit: ${userName}`,
      });
    }
  }

  async notifyUserCreatedByAdmin(
    userId: string,
    userName: string,
    createdByAdminName: string,
  ) {
    const admins = await this.getAdmins();

    // Notify the created user
    await this.notify({
      userId,
      type: 'USER_CREATED',
      content: `Votre compte a été créé par l'administrateur ${createdByAdminName}. Mot de passe par défaut: 12345678`,
    });

    // Notify other admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'USER_CREATED',
        content: `${createdByAdminName} a créé un compte pour ${userName}`,
      });
    }
  }

  async notifyUserStatusChange(
    userId: string,
    userName: string,
    isActive: boolean,
  ) {
    const admins = await this.getAdmins();
    const status = isActive ? 'activé' : 'désactivé';

    // Notify the user
    await this.notify({
      userId,
      type: 'USER_STATUS_CHANGE',
      content: `Votre compte a été ${status}.`,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'USER_STATUS_CHANGE',
        content: `Le compte de ${userName} a été ${status}.`,
      });
    }
  }

  async notifyUserDeleted(userId: string, userName: string) {
    const admins = await this.getAdmins();

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'USER_DELETED',
        content: `Le compte de ${userName} a été supprimé.`,
      });
    }
  }

  // =================== PROJECT EVENTS ===================

  async notifyProjectCreated(
    projectId: string,
    projectTitle: string,
    ownerId: string,
    ownerName: string,
  ) {
    const admins = await this.getAdmins();

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'PROJECT_CREATED',
      content: `Votre projet "${projectTitle}" a été créé avec succès. Il sera visible après validation par un administrateur.`,
      projectId,
    });

    // Notify all admins for approval
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'PROJECT_CREATED',
        content: `Nouveau projet créé par ${ownerName}: "${projectTitle}". En attente de validation.`,
        projectId,
      });
    }
  }

  async notifyProjectActivated(
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'PROJECT_ACTIVATED',
      content: `Votre projet "${projectTitle}" a été activé et est maintenant visible aux investisseurs !`,
      projectId,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'PROJECT_ACTIVATED',
        content: `Le projet "${projectTitle}" a été activé.`,
        projectId,
      });
    }
  }

  async notifyProjectSuspended(
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Get all investors of this project
    const investments = await this.prismaService.investment.findMany({
      where: { projectStage: { projectId } },
      include: { user: true },
    });

    const uniqueInvestors = Array.from(
      new Map(investments.map((inv) => [inv.userId, inv.user])).values(),
    );

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'PROJECT_SUSPENDED',
      content: `Votre projet "${projectTitle}" a été suspendu.`,
      projectId,
    });

    // Notify all investors
    for (const investor of uniqueInvestors) {
      await this.notify({
        userId: investor.id,
        type: 'PROJECT_SUSPENDED',
        content: `Le projet "${projectTitle}" dans lequel vous avez investi a été suspendu.`,
        projectId,
      });
    }

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'PROJECT_SUSPENDED',
        content: `Le projet "${projectTitle}" a été suspendu.`,
        projectId,
      });
    }
  }

  async notifyProjectUpdated(
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Get all investors
    const investments = await this.prismaService.investment.findMany({
      where: { projectStage: { projectId } },
      include: { user: true },
    });

    const uniqueInvestors = Array.from(
      new Map(investments.map((inv) => [inv.userId, inv.user])).values(),
    );

    // Notify all investors
    for (const investor of uniqueInvestors) {
      await this.notify({
        userId: investor.id,
        type: 'PROJECT_UPDATED',
        content: `Le projet "${projectTitle}" a été mis à jour.`,
        projectId,
      });
    }

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'PROJECT_UPDATED',
        content: `Le projet "${projectTitle}" a été mis à jour.`,
        projectId,
      });
    }
  }

  async notifyProjectDeleted(
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'PROJECT_DELETED',
        content: `Le projet "${projectTitle}" a été supprimé.`,
      });
    }
  }

  // =================== PROJECT STAGE EVENTS ===================

  async notifyProjectStageFunded(
    projectStageId: string,
    projectId: string,
    stageTitle: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Get all investors of this stage
    const investments = await this.prismaService.investment.findMany({
      where: { projectStageId },
      include: { user: true },
    });

    const uniqueInvestors = Array.from(
      new Map(investments.map((inv) => [inv.userId, inv.user])).values(),
    );

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'STAGE_FUNDED',
      content: `🎉 L'étape "${stageTitle}" de votre projet "${projectTitle}" a atteint son objectif de financement !`,
      projectId,
      projectStageId,
    });

    // Notify all investors
    for (const investor of uniqueInvestors) {
      await this.notify({
        userId: investor.id,
        type: 'STAGE_FUNDED',
        content: `🎉 L'étape "${stageTitle}" du projet "${projectTitle}" a été entièrement financée !`,
        projectId,
        projectStageId,
      });
    }

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'STAGE_FUNDED',
        content: `L'étape "${stageTitle}" du projet "${projectTitle}" a été financée.`,
        projectId,
        projectStageId,
      });
    }
  }

  // =================== INVESTMENT EVENTS ===================

  async notifyInvestmentCreated(
    investmentId: string,
    investorId: string,
    investorName: string,
    amount: number,
    projectStageId: string,
    stageTitle: string,
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'INVESTMENT_CREATED',
      content: `Votre investissement de ${amount}€ pour l'étape "${stageTitle}" du projet "${projectTitle}" est en attente de paiement.`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'INVESTMENT_CREATED',
      content: `${investorName} a initié un investissement de ${amount}€ pour l'étape "${stageTitle}" (en attente de paiement).`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'INVESTMENT_CREATED',
        content: `Nouvel investissement en attente: ${investorName} - ${amount}€ pour "${projectTitle}".`,
        projectId,
        projectStageId,
        investmentId,
      });
    }
  }

  async notifyInvestmentConfirmed(
    investmentId: string,
    investorId: string,
    investorName: string,
    amount: number,
    projectStageId: string,
    stageTitle: string,
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'INVESTMENT_CONFIRMED',
      content: `✅ Votre investissement de ${amount}€ pour l'étape "${stageTitle}" du projet "${projectTitle}" a été confirmé !`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'INVESTMENT_CONFIRMED',
      content: `✅ ${investorName} a investi ${amount}€ dans l'étape "${stageTitle}" !`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'INVESTMENT_CONFIRMED',
        content: `Investissement confirmé: ${investorName} - ${amount}€ pour "${projectTitle}".`,
        projectId,
        projectStageId,
        investmentId,
      });
    }
  }

  async notifyInvestmentCancelled(
    investmentId: string,
    investorId: string,
    investorName: string,
    amount: number,
    projectStageId: string,
    stageTitle: string,
    projectId: string,
    projectTitle: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'INVESTMENT_CANCELLED',
      content: `Votre investissement de ${amount}€ pour l'étape "${stageTitle}" du projet "${projectTitle}" a été annulé.`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'INVESTMENT_CANCELLED',
      content: `L'investissement de ${investorName} (${amount}€) pour l'étape "${stageTitle}" a été annulé.`,
      projectId,
      projectStageId,
      investmentId,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'INVESTMENT_CANCELLED',
        content: `Investissement annulé: ${investorName} - ${amount}€ pour "${projectTitle}".`,
        projectId,
        projectStageId,
        investmentId,
      });
    }
  }

  async notifyInvestmentFailed(
    investmentId: string,
    investorId: string,
    amount: number,
    projectStageId: string,
    stageTitle: string,
    projectId: string,
    projectTitle: string,
  ) {
    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'INVESTMENT_FAILED',
      content: `❌ Le paiement de ${amount}€ pour l'étape "${stageTitle}" du projet "${projectTitle}" a échoué. Veuillez réessayer.`,
      projectId,
      projectStageId,
      investmentId,
    });
  }

  // =================== TRANSACTION/PAYMENT EVENTS ===================

  async notifyPaymentPending(
    investmentId: string,
    investorId: string,
    amount: number,
    projectTitle: string,
  ) {
    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'PAYMENT_PENDING',
      content: `Votre paiement de ${amount}€ pour "${projectTitle}" est en cours de traitement.`,
      investmentId,
    });
  }

  async notifyPaymentSuccess(
    investmentId: string,
    investorId: string,
    amount: number,
    projectTitle: string,
  ) {
    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'PAYMENT_SUCCESS',
      content: `✅ Votre paiement de ${amount}€ pour "${projectTitle}" a été validé avec succès !`,
      investmentId,
    });
  }

  async notifyPaymentFailed(
    investmentId: string,
    investorId: string,
    amount: number,
    projectTitle: string,
  ) {
    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'PAYMENT_FAILED',
      content: `❌ Votre paiement de ${amount}€ pour "${projectTitle}" a échoué. Veuillez réessayer.`,
      investmentId,
    });
  }

  async notifyRefundProcessed(
    investmentId: string,
    investorId: string,
    investorName: string,
    amount: number,
    projectTitle: string,
    projectId: string,
    ownerId: string,
  ) {
    const admins = await this.getAdmins();

    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'REFUND_PROCESSED',
      content: `Un remboursement de ${amount}€ pour "${projectTitle}" a été traité.`,
      investmentId,
      projectId,
    });

    // Notify project owner
    await this.notify({
      userId: ownerId,
      type: 'REFUND_PROCESSED',
      content: `Un remboursement de ${amount}€ a été effectué pour ${investorName}.`,
      investmentId,
      projectId,
    });

    // Notify admins
    for (const admin of admins) {
      await this.notify({
        userId: admin.id,
        type: 'REFUND_PROCESSED',
        content: `Remboursement traité: ${amount}€ pour ${investorName} - "${projectTitle}".`,
        investmentId,
        projectId,
      });
    }
  }

  async notifyDividendPaid(
    investorId: string,
    amount: number,
    projectTitle: string,
    projectId: string,
  ) {
    // Notify investor
    await this.notify({
      userId: investorId,
      type: 'DIVIDEND_PAID',
      content: `💰 Vous avez reçu un dividende de ${amount}€ du projet "${projectTitle}" !`,
      projectId,
    });
  }
}
