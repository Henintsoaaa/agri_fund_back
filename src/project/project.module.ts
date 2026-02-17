import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStageService } from './project-stage.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService, ProjectStageService],
})
export class ProjectModule {}
