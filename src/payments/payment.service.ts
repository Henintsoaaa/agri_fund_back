import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { InvestmentService } from '../investment/investment.service';
import Stripe from 'stripe';
import { TransactionStatus, TransactionType } from '@/generated/prisma/enums';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new LoggerService('PaymentService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly investmentService: InvestmentService,
  ) {
    // Initialiser Stripe avec la clé secrète
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Payment features will not work.',
      );
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-02-25.clover',
      });
    }
  }

  public constructWebhookEvent(
    body: Buffer,
    sig: string,
    endpointSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(body, sig, endpointSecret);
  }

  /**
   * Envoie la demande de paiement au provider externe.
   */
  async processPayment(
    investmentId: string,
    amount: number,
    provider: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' = 'STRIPE',
    user?: any,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    // Vérifier que l'investissement existe
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        user: true,
        projectStage: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investissement introuvable');
    }

    // SECURITY: Verify that the user owns this investment (unless admin)
    if (user && user.role !== 'ADMIN' && investment.userId !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas effectuer de paiement pour cet investissement',
      );
    }

    // Créer la transaction PAYMENT PENDING
    const transaction = await this.transactionService.createTransaction({
      investmentId,
      amount,
      type: TransactionType.PAYMENT,
      provider,
    });

    try {
      if (provider === 'STRIPE') {
        return await this.processStripePayment(
          transaction.id,
          amount,
          investment,
        );
      } else if (provider === 'PAYPAL') {
        return await this.processPayPalPayment(
          transaction.id,
          amount,
          investment,
        );
      } else if (provider === 'BANK_TRANSFER') {
        return await this.processBankTransfer(
          transaction.id,
          amount,
          investment,
        );
      } else {
        throw new BadRequestException('Provider de paiement non supporté');
      }
    } catch (error) {
      // Mettre à jour la transaction en FAILED
      await this.transactionService.updateTransactionStatus(
        transaction.id,
        TransactionStatus.FAILED,
      );
      throw error;
    }
  }

  /**
   * Traitement Stripe
   */
  private async processStripePayment(
    transactionId: string,
    amount: number,
    investment: any,
  ) {
    try {
      // Créer un PaymentIntent Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          transactionId,
          investmentId: investment.id,
          userId: investment.userId,
          projectId: investment.projectStage.projectId,
          stageId: investment.projectStageId,
        },
        description: `Investissement dans ${investment.projectStage.project.title} - ${investment.projectStage.title}`,
      });

      // Mettre à jour la transaction avec l'ID Stripe
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          providerTransactionId: paymentIntent.id,
        },
      });

      return {
        provider: 'STRIPE',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId,
        amount,
        status: 'PENDING',
      };
    } catch (error) {
      throw new InternalServerErrorException(`Erreur Stripe: ${error.message}`);
    }
  }

  /**
   * Traitement PayPal (NON IMPLÉMENTÉ)
   * TODO: Implement PayPal integration with proper API calls
   */
  private async processPayPalPayment(
    transactionId: string,
    amount: number,
    investment: any,
  ) {
    // PayPal integration is not yet implemented
    throw new BadRequestException(
      'PayPal payment provider is not yet implemented. Please use STRIPE or BANK_TRANSFER.',
    );
  }

  /**
   * Traitement virement bancaire (instructions)
   */
  private async processBankTransfer(
    transactionId: string,
    amount: number,
    investment: any,
  ) {
    return {
      provider: 'BANK_TRANSFER',
      transactionId,
      amount,
      status: 'PENDING',
      instructions: {
        iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
        bic: 'XXXXXXXX',
        beneficiary: 'AMONITA PLATFORM',
        reference: `INV-${transactionId.substring(0, 8)}`,
        message: 'Virement bancaire - Validation manuelle requise',
      },
    };
  }

  /**
   * Reçoit callback du provider et met à jour transaction status (PENDING → SUCCESS/FAILED).
   */
  async handleWebhook(provider: string, rawBody: Buffer, signature: string) {
    if (provider === 'STRIPE') {
      return await this.handleStripeWebhook(rawBody, signature);
    } else if (provider === 'PAYPAL') {
      return await this.handlePayPalWebhook(rawBody);
    } else {
      throw new BadRequestException('Provider non supporté');
    }
  }

  /**
   * Traitement webhook Stripe
   */
  private async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET non configuré',
      );
    }

    let event: Stripe.Event;

    try {
      // Vérifier la signature du webhook
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature invalide: ${error.message}`,
      );
    }

    // Traiter les événements Stripe
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await this.handlePaymentSuccess(
          event.data.object as Stripe.PaymentIntent,
        );

      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );

      case 'charge.refunded':
        return await this.handleRefundSuccess(
          event.data.object as Stripe.Charge,
        );

      default:
        return { received: true, eventType: event.type };
    }
  }

  /**
   * Gestion succès de paiement
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const transactionId = paymentIntent.metadata.transactionId;

    if (!transactionId) {
      throw new BadRequestException('Transaction ID manquant dans metadata');
    }

    // Mettre à jour la transaction (déclenchera la confirmation de l'investissement)
    await this.transactionService.updateTransactionStatus(
      transactionId,
      TransactionStatus.SUCCESS,
    );

    return { received: true, status: 'SUCCESS', transactionId };
  }

  /**
   * Gestion échec de paiement
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const transactionId = paymentIntent.metadata.transactionId;

    if (!transactionId) {
      throw new BadRequestException('Transaction ID manquant dans metadata');
    }

    await this.transactionService.updateTransactionStatus(
      transactionId,
      TransactionStatus.FAILED,
    );

    return { received: true, status: 'FAILED', transactionId };
  }

  /**
   * Gestion succès de remboursement
   */
  private async handleRefundSuccess(charge: Stripe.Charge) {
    // Le refund est lié au PaymentIntent
    const paymentIntentId = charge.payment_intent as string;

    // Trouver la transaction REFUND correspondante
    const refundTransaction = await this.prisma.transaction.findFirst({
      where: {
        providerTransactionId: paymentIntentId,
        type: TransactionType.REFUND,
      },
    });

    if (refundTransaction) {
      await this.transactionService.updateTransactionStatus(
        refundTransaction.id,
        TransactionStatus.SUCCESS,
      );
    }

    return { received: true, status: 'REFUNDED', paymentIntentId };
  }

  /**
   * Traitement webhook PayPal (NON IMPLÉMENTÉ)
   * TODO: Implement PayPal webhook verification and processing
   */
  private async handlePayPalWebhook(rawBody: Buffer) {
    // PayPal webhook handling is not yet implemented
    throw new BadRequestException(
      'PayPal webhook handling is not yet implemented.',
    );
  }

  /**
   * Crée une demande de remboursement auprès du provider.
   */
  async refundPayment(transactionId: string, amount?: number, reason?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        investment: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    if (transaction.type !== TransactionType.PAYMENT) {
      throw new BadRequestException(
        'Seules les transactions PAYMENT peuvent être remboursées',
      );
    }

    if (transaction.status !== TransactionStatus.SUCCESS) {
      throw new BadRequestException(
        'Seules les transactions SUCCESS peuvent être remboursées',
      );
    }

    if (!transaction.providerTransactionId) {
      throw new BadRequestException('Provider transaction ID manquant');
    }

    // Montant à rembourser (par défaut: montant complet)
    const refundAmount = amount || transaction.amount;

    if (refundAmount > transaction.amount) {
      throw new BadRequestException(
        'Le montant du remboursement ne peut pas dépasser le montant initial',
      );
    }

    // Créer une transaction REFUND
    const refundTransaction =
      await this.transactionService.createRefundTransaction(
        transaction.investmentId,
        refundAmount,
        transaction.provider,
      );

    try {
      if (transaction.provider === 'STRIPE') {
        return await this.refundStripePayment(
          transaction.providerTransactionId,
          refundAmount,
          refundTransaction.id,
          reason,
        );
      } else if (transaction.provider === 'PAYPAL') {
        return await this.refundPayPalPayment(
          transaction.providerTransactionId,
          refundAmount,
          refundTransaction.id,
        );
      } else {
        throw new BadRequestException(
          'Provider non supporté pour remboursement',
        );
      }
    } catch (error) {
      // Marquer la transaction de remboursement comme FAILED
      await this.transactionService.updateTransactionStatus(
        refundTransaction.id,
        TransactionStatus.FAILED,
      );
      throw error;
    }
  }

  /**
   * Remboursement Stripe
   */
  private async refundStripePayment(
    paymentIntentId: string,
    amount: number,
    refundTransactionId: string,
    reason?: string,
  ) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100), // Centimes
        reason: (reason as any) || 'requested_by_customer',
        metadata: {
          refundTransactionId,
        },
      });

      // Mettre à jour la transaction REFUND avec l'ID Stripe
      await this.prisma.transaction.update({
        where: { id: refundTransactionId },
        data: {
          providerTransactionId: refund.id,
        },
      });

      // Si le remboursement est immédiat, mettre à jour le status
      if (refund.status === 'succeeded') {
        await this.transactionService.updateTransactionStatus(
          refundTransactionId,
          TransactionStatus.SUCCESS,
        );
      }

      return {
        provider: 'STRIPE',
        refundId: refund.id,
        transactionId: refundTransactionId,
        amount,
        status: refund.status,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur remboursement Stripe: ${error.message}`,
      );
    }
  }

  /**
   * Remboursement PayPal (structure de base)
   */
  private async refundPayPalPayment(
    paypalTransactionId: string,
    amount: number,
    refundTransactionId: string,
  ) {
    // TODO: Implémenter le remboursement PayPal
    return {
      provider: 'PAYPAL',
      transactionId: refundTransactionId,
      amount,
      message: 'PayPal refund non implémenté',
    };
  }

  /**
   * Vérifie l'état réel de la transaction chez le provider.
   */
  async verifyTransaction(providerTransactionId: string, provider: string) {
    if (provider === 'STRIPE') {
      return await this.verifyStripeTransaction(providerTransactionId);
    } else if (provider === 'PAYPAL') {
      return await this.verifyPayPalTransaction(providerTransactionId);
    } else {
      throw new BadRequestException('Provider non supporté');
    }
  }

  /**
   * Vérification Stripe
   */
  private async verifyStripeTransaction(paymentIntentId: string) {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        provider: 'STRIPE',
        providerTransactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: this.mapStripeStatus(paymentIntent.status),
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur vérification Stripe: ${error.message}`,
      );
    }
  }

  /**
   * Vérification PayPal (structure de base)
   */
  private async verifyPayPalTransaction(transactionId: string) {
    // TODO: Implémenter la vérification PayPal
    return {
      provider: 'PAYPAL',
      providerTransactionId: transactionId,
      message: 'PayPal verification non implémentée',
    };
  }

  /**
   * Retourne l'état actuel du paiement chez le provider.
   */
  async getProviderStatus(transactionId: string, user?: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        investment: {
          include: {
            projectStage: {
              include: {
                project: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    // SECURITY: Verify that the user owns this transaction (unless admin)
    if (
      user &&
      user.role !== 'ADMIN' &&
      transaction.investment.userId !== user.id
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez pas consulter cette transaction',
      );
    }

    if (!transaction.providerTransactionId) {
      return {
        transactionId: transaction.id,
        status: transaction.status,
        provider: transaction.provider,
        message: 'Aucun ID de transaction provider',
      };
    }

    // Vérifier chez le provider
    const providerStatus = await this.verifyTransaction(
      transaction.providerTransactionId,
      transaction.provider,
    );

    // Comparer avec notre status local
    const localStatus = transaction.status;
    const providerMappedStatus =
      'status' in providerStatus
        ? providerStatus.status
        : TransactionStatus.PENDING;

    return {
      transactionId: transaction.id,
      localStatus,
      providerStatus: providerMappedStatus,
      providerTransactionId: transaction.providerTransactionId,
      provider: transaction.provider,
      amount: transaction.amount,
      type: transaction.type,
      synchronized: localStatus === providerMappedStatus,
      investment: {
        id: transaction.investment.id,
        projectTitle: transaction.investment.projectStage.project.title,
        stageTitle: transaction.investment.projectStage.title,
        investor: transaction.investment.user.name,
      },
      providerDetails: providerStatus,
    };
  }

  /**
   * Mapper les statuts Stripe vers nos statuts
   */
  private mapStripeStatus(stripeStatus: string): TransactionStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return TransactionStatus.SUCCESS;
      case 'processing':
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return TransactionStatus.PENDING;
      case 'canceled':
      case 'requires_capture':
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.PENDING;
    }
  }
}
