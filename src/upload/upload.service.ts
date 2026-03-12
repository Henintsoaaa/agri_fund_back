import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
}

@Injectable()
export class UploadService {
  private readonly uploadBasePath = './uploads';

  /**
   * Upload a file and return the filename
   */
  async uploadFile(
    file: any,
    destination: string,
    allowedTypes?: RegExp,
    maxSize?: number,
  ): Promise<FileUploadResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type if specified
    if (allowedTypes) {
      const mimeType = allowedTypes.test(file.mimetype);
      const ext = allowedTypes.test(extname(file.originalname).toLowerCase());

      if (!mimeType && !ext) {
        throw new BadRequestException(
          'File type not allowed. Please upload a valid file.',
        );
      }
    }

    // Validate file size if specified
    if (maxSize && file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // Ensure destination directory exists
    const fullDestination = path.join(this.uploadBasePath, destination);
    if (!fs.existsSync(fullDestination)) {
      fs.mkdirSync(fullDestination, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = extname(file.originalname);
    const filename = `${destination}-${uniqueSuffix}${fileExtension}`;

    // Save file
    const filePath = path.join(fullDestination, filename);
    fs.writeFileSync(filePath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/${destination}/${filename}`,
    };
  }

  /**
   * Upload proof file
   */
  async uploadProofFile(file: any): Promise<FileUploadResult> {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const maxSize = 10 * 1024 * 1024; // 10MB

    return this.uploadFile(file, 'proofs', allowedTypes, maxSize);
  }

  /**
   * Upload project image
   */
  async uploadProjectImage(file: any): Promise<FileUploadResult> {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const maxSize = 5 * 1024 * 1024; // 5MB

    return this.uploadFile(file, 'projects', allowedTypes, maxSize);
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadBasePath, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
