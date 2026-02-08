import { IsBoolean, IsString } from 'class-validator';

export class EditUserDto {
  @IsString()
  id: string;

  @IsBoolean()
  isActive: boolean;
}
