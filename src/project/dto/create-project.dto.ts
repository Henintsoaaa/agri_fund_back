import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export type Project_statut = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
export type Project_stage_statut = 'OPEN' | 'FUNDED' | 'CLOSED';

export class CreateProjectStageDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  targetAmount: number;

  @IsNumber()
  @IsNotEmpty()
  stageOrder: number;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  statut: Project_statut;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectStageDto)
  stages: CreateProjectStageDto[];
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  statut?: Project_statut;
}
