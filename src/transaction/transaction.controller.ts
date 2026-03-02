import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  UpdateTransactionStatusDto,
} from './dto/CreateTransaction.dto';
import { TransactionStatus } from '@/generated/prisma/enums';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * POST /transaction
   * Crée une transaction (PAYMENT, REFUND, DIVIDEND)
   */
  @Post()
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return await this.transactionService.createTransaction(
      createTransactionDto,
    );
  }

  /**
   * PATCH /transaction/:id/status
   * Met à jour le status d'une transaction (SUCCESS, FAILED)
   */
  @Patch(':id/status')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateTransactionStatus(
    @Param('id') transactionId: string,
    @Body() body: UpdateTransactionStatusDto,
  ) {
    return await this.transactionService.updateTransactionStatus(
      transactionId,
      body.status,
    );
  }

  /**
   * GET /transaction/investment/:investmentId
   * Retourne toutes les transactions d'un investissement
   */
  @Get('investment/:investmentId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'PROJECT_OWNER', 'ADMIN')
  async getTransactionsByInvestment(
    @Param('investmentId') investmentId: string,
  ) {
    // Note: La vérification de propriété pourrait être ajoutée ici
    return await this.transactionService.getTransactionsByInvestment(
      investmentId,
    );
  }

  /**
   * GET /transaction/user/:userId
   * Retourne toutes les transactions d'un utilisateur
   */
  @Get('user/:userId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async getUserTransactions(@Param('userId') userId: string, @Req() req) {
    // Un investisseur ne peut voir que ses propres transactions
    if (req.user.role === 'INVESTOR' && userId !== req.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres transactions',
      );
    }
    return await this.transactionService.getUserTransactions(userId);
  }

  /**
   * POST /transaction/refund
   * Crée une transaction REFUND
   */
  @Post('refund')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createRefundTransaction(
    @Body()
    body: {
      investmentId: string;
      amount: number;
      provider?: string;
    },
  ) {
    return await this.transactionService.createRefundTransaction(
      body.investmentId,
      body.amount,
      body.provider,
    );
  }

  /**
   * GET /transaction/stats/invested/:userId
   * Calcule le total investi par un utilisateur
   */
  @Get('stats/invested/:userId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async calculateTotalInvested(@Param('userId') userId: string, @Req() req) {
    // Un investisseur ne peut voir que ses propres stats
    if (req.user.role === 'INVESTOR' && userId !== req.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres statistiques',
      );
    }
    return await this.transactionService.calculateTotalInvested(userId);
  }

  /**
   * GET /transaction/stats/refunded/:userId
   * Calcule le total remboursé à un utilisateur
   */
  @Get('stats/refunded/:userId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async calculateTotalRefunded(@Param('userId') userId: string, @Req() req) {
    // Un investisseur ne peut voir que ses propres stats
    if (req.user.role === 'INVESTOR' && userId !== req.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres statistiques',
      );
    }
    return await this.transactionService.calculateTotalRefunded(userId);
  }

  /**
   * GET /transaction/stats/dividends/:userId
   * Calcule les dividendes reçus par un utilisateur
   */
  @Get('stats/dividends/:userId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async calculateDividends(@Param('userId') userId: string, @Req() req) {
    // Un investisseur ne peut voir que ses propres stats
    if (req.user.role === 'INVESTOR' && userId !== req.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres statistiques',
      );
    }
    return await this.transactionService.calculateDividends(userId);
  }
}
