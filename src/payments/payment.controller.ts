import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payment/process
   * Initier un paiement
   */
  @Post('process')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async processPayment(
    @Body()
    body: {
      investmentId: string;
      amount: number;
      provider?: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER';
    },
    @Req() req,
  ) {
    return await this.paymentService.processPayment(
      body.investmentId,
      body.amount,
      body.provider || 'STRIPE',
      req.user, // Pass user for authorization check
    );
  }

  /**
   * POST /payment/refund/:transactionId
   * Créer un remboursement
   */
  @Post('refund/:transactionId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async refundPayment(
    @Param('transactionId') transactionId: string,
    @Body()
    body?: {
      amount?: number;
      reason?: string;
    },
  ) {
    return await this.paymentService.refundPayment(
      transactionId,
      body?.amount,
      body?.reason,
    );
  }

  /**
   * GET /payment/verify/:providerTransactionId
   * Vérifier une transaction chez le provider
   */
  @Get('verify/:providerTransactionId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async verifyTransaction(
    @Param('providerTransactionId') providerTransactionId: string,
    @Body() body: { provider: string },
  ) {
    return await this.paymentService.verifyTransaction(
      providerTransactionId,
      body.provider,
    );
  }

  /**
   * GET /payment/status/:transactionId
   * Obtenir le status d'une transaction
   */
  @Get('status/:transactionId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async getProviderStatus(
    @Param('transactionId') transactionId: string,
    @Req() req,
  ) {
    return await this.paymentService.getProviderStatus(
      transactionId,
      req.user, // Pass user for authorization check
    );
  }
}

/**
 * Contrôleur séparé pour les webhooks (nécessite raw body)
 */
@Controller('webhook')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /webhook/stripe
   * Recevoir les webhooks Stripe
   */
  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Stripe signature manquante');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Raw body manquant');
    }

    return await this.paymentService.handleWebhook(
      'STRIPE',
      req.rawBody,
      signature,
    );
  }

  /**
   * POST /webhook/paypal
   * Recevoir les webhooks PayPal
   */
  @Post('paypal')
  @HttpCode(200)
  async handlePayPalWebhook(@Req() req: RawBodyRequest<Request>) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw body manquant');
    }

    return await this.paymentService.handleWebhook('PAYPAL', req.rawBody, '');
  }
}
