import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { TransactionType, TransactionStatus } from '@/generated/prisma/enums';

export class CreateTransactionDto {
  @IsString()
  investmentId: string;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
  amount: number;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  providerTransactionId?: string;
}

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsString()
  @IsOptional()
  providerTransactionId?: string;
}
