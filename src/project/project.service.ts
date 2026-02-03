import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  createProject() {
    return this.prisma.project.create({
      data: {
        ownerId: '1',
        title: 'New Project',
        description: 'This is a new project',
        statut: 'ACTIVE',
      },
    });
  }
}
