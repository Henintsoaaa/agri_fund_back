import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/proof
   * Upload a proof file
   */
  @Post('proof')
  @UseGuards(BetterAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.uploadService.uploadProofFile(file);
    return {
      filename: result.filename,
      path: result.path,
      originalName: result.originalName,
      size: result.size,
    };
  }

  /**
   * POST /upload/project-image
   * Upload a project image
   */
  @Post('project-image')
  @UseGuards(BetterAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProjectImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.uploadService.uploadProjectImage(file);
    return {
      filename: result.filename,
      path: result.path,
      originalName: result.originalName,
      size: result.size,
    };
  }
}
