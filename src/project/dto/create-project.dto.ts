import { IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { CreateProjectStageDto } from './create-project-stage.dto';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  statut: Project_statut;

  @IsString()
  @IsNotEmpty()
  image: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectStageDto)
  stages?: CreateProjectStageDto[];
}

export type Project_statut = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';

export class UpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  statut: Project_statut;
}
