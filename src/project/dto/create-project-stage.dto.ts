import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export type ProjectStage_statut = 'OPEN' | 'FUNDED' | 'CLOSED';

export class CreateProjectStageDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  stageOrder: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  targetAmount: number;

  @IsNotEmpty()
  @IsString()
  image: string;
}
