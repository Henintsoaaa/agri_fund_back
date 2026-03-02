import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { CreateInvestmentDto } from './dto/CreateInvestment.dto';
import { InvestmentStatus } from '@/generated/prisma/enums';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('investment')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  /**
   * POST /investment
   * Crée un investissement PENDING
   */
  @Post()
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  async createInvestment(
    @Body() createInvestmentDto: CreateInvestmentDto,
    @Req() req,
  ) {
    // Vérifier que l'investisseur crée son propre investissement
    if (
      req.user.role === 'INVESTOR' &&
      createInvestmentDto.userId !== req.user.id
    ) {
      throw new ForbiddenException("Vous ne pouvez investir qu'en votre nom");
    }
    return await this.investmentService.createInvestment(createInvestmentDto);
  }

  /**
   * PATCH /investment/:id/confirm
   * Confirme un investissement après validation du paiement
   */
  @Patch(':id/confirm')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async confirmInvestment(@Param('id') investmentId: string) {
    return await this.investmentService.confirmInvestment(investmentId);
  }

  /**
   * PATCH /investment/:id/cancel
   * Annule un investissement
   */
  @Patch(':id/cancel')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async cancelInvestment(@Param('id') investmentId: string, @Req() req) {
    // Vérifier que l'investisseur annule son propre investissement
    if (req.user.role === 'INVESTOR') {
      const investment = await this.investmentService.getInvestorInvestments(
        req.user.id,
      );
      if (!investment.find((inv) => inv.id === investmentId)) {
        throw new ForbiddenException(
          'Vous ne pouvez annuler que vos propres investissements',
        );
      }
    }
    return await this.investmentService.cancelInvestment(investmentId);
  }

  /**
   * GET /investment/investor/:investorId
   * Retourne tous les investissements d'un investisseur
   */
  @Get('investor/:investorId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async getInvestorInvestments(
    @Param('investorId') investorId: string,
    @Req() req,
  ) {
    // Un investisseur ne peut voir que ses propres investissements
    if (req.user.role === 'INVESTOR' && investorId !== req.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres investissements',
      );
    }
    return await this.investmentService.getInvestorInvestments(investorId);
  }

  /**
   * GET /investment/stage/:stageId
   * Retourne tous les investissements d'un stage
   */
  @Get('stage/:stageId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER', 'ADMIN')
  async getStageInvestments(@Param('stageId') stageId: string) {
    return await this.investmentService.getStageInvestments(stageId);
  }

  /**
   * GET /investment/roi/:investorId
   * Calcule le ROI d'un investisseur
   */
  @Get('roi/:investorId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('INVESTOR', 'ADMIN')
  async calculateROI(@Param('investorId') investorId: string, @Req() req) {
    // Un investisseur ne peut voir que son propre ROI
    if (req.user.role === 'INVESTOR' && investorId !== req.user.id) {
      throw new ForbiddenException('Vous ne pouvez voir que votre propre ROI');
    }
    return await this.investmentService.calculateROI(investorId);
  }

  /**
   * GET /investment/stats/:stageId
   * Statistiques d'un stage
   */
  @Get('stats/:stageId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER', 'ADMIN', 'INVESTOR')
  async getInvestmentStats(@Param('stageId') stageId: string) {
    return await this.investmentService.getInvestmentStats(stageId);
  }

  /**
   * PATCH /investment/:id/status
   * Met à jour le status d'un investissement
   */
  @Patch(':id/status')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateInvestmentStatus(
    @Param('id') investmentId: string,
    @Body() body: { status: InvestmentStatus },
  ) {
    return await this.investmentService.updateInvestmentStatus(
      investmentId,
      body.status,
    );
  }
}
