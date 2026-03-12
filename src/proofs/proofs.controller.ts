import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProofsService } from './proofs.service';
import { UploadService } from '../upload/upload.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('proofs')
export class ProofsController {
  constructor(
    private readonly proofsService: ProofsService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * POST /proofs/upload
   * Upload a proof file (project owner only)
   */
  @Post('upload')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const { projectId, projectStageId, title, description } = body;

    if (!projectId || !title) {
      throw new BadRequestException('ProjectId and title are required');
    }

    // Upload file using upload service
    const uploadResult = await this.uploadService.uploadProofFile(file);

    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';

    return await this.proofsService.createProof({
      projectId,
      projectStageId: projectStageId || null,
      title,
      description: description || null,
      fileUrl: uploadResult.path,
      fileType,
      uploadedBy: req.user.id,
    });
  }

  /**
   * GET /proofs/my-proofs
   * Get all proofs uploaded by the current project owner
   */
  @Get('my-proofs')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  async getMyProofs(@Req() req: any) {
    return await this.proofsService.getMyProofs(req.user.id);
  }

  /**
   * GET /proofs/stage/:stageId
   * Get approved proofs for a funded stage (accessible by all users)
   */
  @Get('stage/:stageId')
  @UseGuards(BetterAuthGuard)
  async getStageProofs(@Param('stageId') stageId: string) {
    return await this.proofsService.getStageProofs(stageId);
  }

  /**
   * GET /proofs/project/:projectId
   * Get all approved proofs for a project (accessible by all users)
   */
  @Get('project/:projectId')
  @UseGuards(BetterAuthGuard)
  async getProjectProofs(@Param('projectId') projectId: string) {
    return await this.proofsService.getProjectProofs(projectId);
  }

  /**
   * GET /proofs/pending
   * Get all pending proofs (admin only)
   */
  @Get('pending')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingProofs() {
    return await this.proofsService.getPendingProofs();
  }

  /**
   * PATCH /proofs/:id/approve
   * Approve a proof (admin only)
   */
  @Patch(':id/approve')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveProof(@Param('id') id: string, @Req() req: any) {
    return await this.proofsService.approveProof(id, req.user.id);
  }

  /**
   * PATCH /proofs/:id/reject
   * Reject a proof (admin only)
   */
  @Patch(':id/reject')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectProof(@Param('id') id: string, @Req() req: any) {
    return await this.proofsService.rejectProof(id, req.user.id);
  }

  /**
   * DELETE /proofs/:id
   * Delete a proof (owner only, before approval)
   */
  @Delete(':id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  async deleteProof(@Param('id') id: string, @Req() req: any) {
    return await this.proofsService.deleteProof(id, req.user.id);
  }
}
