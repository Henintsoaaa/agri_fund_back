import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @UseGuards(BetterAuthGuard)
  async getFavorites(@Req() req: any) {
    const userId = req.user.id;

    // For now, return empty array - favorite functionality will be implemented later
    return [];
  }

  @Post(':projectId')
  @UseGuards(BetterAuthGuard)
  async addFavorite(@Param('projectId') projectId: string, @Req() req: any) {
    const userId = req.user.id;

    // Implementation to be added when favorites table is created
    return { message: 'Favorite added successfully' };
  }

  @Delete(':projectId')
  @UseGuards(BetterAuthGuard)
  async removeFavorite(@Param('projectId') projectId: string, @Req() req: any) {
    const userId = req.user.id;

    // Implementation to be added when favorites table is created
    return { message: 'Favorite removed successfully' };
  }
}
