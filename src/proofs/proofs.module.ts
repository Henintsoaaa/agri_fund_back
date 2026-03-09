import { Module } from '@nestjs/common';
import { ProofsController } from './proofs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProofsController],
})
export class ProofsModule {}
