import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
