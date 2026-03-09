import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('proofs')
export class ProofsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @UseGuards(BetterAuthGuard)
  async getProofs(@Req() req: any) {
    const userId = req.user.id;

    // Get projects owned by this user
    const projects = await this.prismaService.project.findMany({
      where: {
        ownerId: userId,
        isDeleted: false,
      },
      include: {
        stages: true,
      },
    });

    // Return mock proofs for now - in production, store in database
    return projects.map((project) => ({
      id: Math.random().toString(36).substr(2, 9),
      projectId: project.id,
      projectName: project.title,
      title: 'Construction Progress - Week 1',
      description: 'Foundation completed',
      imageUrl: '/placeholder.jpg',
      status: 'PENDING',
      uploadedAt: new Date(),
    }));
  }

  @Post('upload')
  @UseGuards(BetterAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const { projectId, title, description } = body;

    // Verify user owns the project
    const project = await this.prismaService.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
        isDeleted: false,
      },
    });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    // In production, save file to storage and create proof record in database
    return {
      message: 'Proof uploaded successfully',
      proof: {
        id: Math.random().toString(36).substr(2, 9),
        projectId,
        title,
        description,
        imageUrl: file ? `/uploads/${file.filename}` : '/placeholder.jpg',
        status: 'PENDING',
        uploadedAt: new Date(),
      },
    };
  }
}
