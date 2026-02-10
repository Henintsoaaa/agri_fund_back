import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateProjectStageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  targetAmount?: number;

  @IsNumber()
  @IsOptional()
  stageOrder?: number;

  @IsString()
  @IsOptional()
  statut?: 'OPEN' | 'FUNDED' | 'CLOSED';
}

export class CreateIndividualStageDto {
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
  @IsOptional()
  stageOrder?: number;
}
