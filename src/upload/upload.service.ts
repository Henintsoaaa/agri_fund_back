import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../common/logger/logger.service';

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
  private readonly logger = new LoggerService('UploadService');

  // Allowed MIME types mapped to their magic number signatures
  private readonly allowedMimeTypes = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/webp': ['52494646'],
    'application/pdf': ['25504446'],
    'application/msword': ['d0cf11e0'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      '504b0304',
    ],
  };

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

    // Sanitize destination to prevent path traversal
    const sanitizedDestination = destination.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Validate file size if specified
    if (maxSize && file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // Validate MIME type against allowed types
    if (allowedTypes && !allowedTypes.test(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Please upload a valid file.',
      );
    }

    // SECURITY: Validate actual file content using magic numbers
    try {
      const fileType = await fileTypeFromBuffer(file.buffer);

      if (!fileType) {
        throw new BadRequestException(
          'Cannot determine file type. File may be corrupted or invalid.',
        );
      }

      // Verify the detected MIME type matches what was claimed
      if (fileType.mime !== file.mimetype) {
        this.logger.warn('MIME type mismatch detected', {
          claimed: file.mimetype,
          actual: fileType.mime,
          filename: file.originalname,
        });
        throw new BadRequestException(
          'File type mismatch. The file content does not match the declared type.',
        );
      }

      // Verify against our whitelist
      if (!Object.keys(this.allowedMimeTypes).includes(fileType.mime)) {
        throw new BadRequestException(
          `File type ${fileType.mime} is not allowed.`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('File validation error', error.message);
      throw new BadRequestException('Failed to validate file');
    }

    // Ensure destination directory exists
    const fullDestination = path.join(
      this.uploadBasePath,
      sanitizedDestination,
    );
    if (!fs.existsSync(fullDestination)) {
      try {
        fs.mkdirSync(fullDestination, { recursive: true });
      } catch (error) {
        this.logger.error('Failed to create upload directory', error.message);
        throw new InternalServerErrorException(
          'Failed to create upload directory',
        );
      }
    }

    // SECURITY: Use UUID for filename to prevent path traversal and filename attacks
    const fileExtension = extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${fileExtension}`;

    // Save file with error handling
    const filePath = path.join(fullDestination, filename);
    try {
      fs.writeFileSync(filePath, file.buffer);
    } catch (error) {
      this.logger.error('Failed to write file', error.stack, {
        path: filePath,
        error: error.message,
      });
      throw new InternalServerErrorException('Failed to save file');
    }

    this.logger.log('File uploaded successfully', {
      filename,
      size: file.size,
      mimetype: file.mimetype,
    });

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${sanitizedDestination}/${filename}`,
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
    // SECURITY: Sanitize path to prevent directory traversal
    const sanitizedPath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(this.uploadBasePath, sanitizedPath);

    // Verify the path is within upload directory
    const resolvedUploadPath = path.resolve(this.uploadBasePath);
    const resolvedFullPath = path.resolve(fullPath);

    if (!resolvedFullPath.startsWith(resolvedUploadPath)) {
      this.logger.warn('Path traversal attempt detected', { filePath });
      throw new BadRequestException('Invalid file path');
    }

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        this.logger.log('File deleted successfully', { path: sanitizedPath });
      } catch (error) {
        this.logger.error('Failed to delete file', error.stack, {
          path: fullPath,
          error: error.message,
        });
        throw new InternalServerErrorException('Failed to delete file');
      }
    }
  }
}
