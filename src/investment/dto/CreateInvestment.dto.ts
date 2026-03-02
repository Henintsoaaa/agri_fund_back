import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { InvestmentStatus } from '@/generated/prisma/enums';

export class CreateInvestmentDto {
  @IsString()
  userId: string;

  @IsString()
  projectStageId: string;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
  amount: number;

  @IsOptional()
  @IsEnum(InvestmentStatus)
  status?: InvestmentStatus;

  @IsOptional()
  @IsString()
  provider?: string; // STRIPE, PAYPAL, BANK_TRANSFER
}
