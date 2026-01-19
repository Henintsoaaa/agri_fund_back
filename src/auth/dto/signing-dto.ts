import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SigningDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
