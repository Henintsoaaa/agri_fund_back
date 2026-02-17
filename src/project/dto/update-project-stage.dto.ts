import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProjectStageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class DeleteProjectStageDto {
  @IsBoolean()
  isDeleted: boolean;
}
