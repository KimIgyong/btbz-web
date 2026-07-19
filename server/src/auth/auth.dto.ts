import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: '새 비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(100)
  newPassword: string;
}
