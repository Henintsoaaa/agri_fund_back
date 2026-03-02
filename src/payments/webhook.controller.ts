import { Controller, Post, Req, Res } from '@nestjs/common';
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { InvestmentService } from '../investment/investment.service';

@Controller('webhook')
export class WebhookController {
  constructor(
    private paymentService: PaymentService,
    private transactionService: TransactionService,
    private investmentService: InvestmentService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || typeof sig !== 'string') {
      console.error('Invalid or missing Stripe signature');
      return res.status(400).send('Webhook Error: Invalid signature');
    }

    if (!endpointSecret) {
      console.error('Missing webhook endpoint secret');
      return res.status(500).send('Webhook Error: Missing endpoint secret');
    }

    let event: Stripe.Event;

    try {
      event = this.paymentService.constructWebhookEvent(
        req.body,
        sig,
        endpointSecret,
      );
    } catch (err) {
      console.error('Webhook signature verification failed', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.transactionService.updateTransactionStatus(
          paymentIntent.metadata.investmentId,
          'SUCCESS',
        );
        // Confirmer l’investissement
        await this.investmentService.confirmInvestment(
          paymentIntent.metadata.investmentId,
        );
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await this.transactionService.updateTransactionStatus(
          failedIntent.metadata.investmentId,
          'FAILED',
        );
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
}
