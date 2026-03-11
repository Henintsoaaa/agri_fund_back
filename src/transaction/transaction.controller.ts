import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

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
