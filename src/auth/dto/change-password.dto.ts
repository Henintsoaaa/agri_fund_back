import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsOptional()
  @IsBoolean()
  revokeOtherSessions?: boolean;
}
