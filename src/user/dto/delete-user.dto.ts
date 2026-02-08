import { IsBoolean, IsString } from 'class-validator';

export class DeleteUserDto {
  @IsString()
  id: string;

  @IsBoolean()
  isDeleted: true;

  @IsBoolean()
  isActive: false;
}
