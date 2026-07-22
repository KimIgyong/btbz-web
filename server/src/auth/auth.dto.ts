import { IsEmail, IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

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

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  // 임시 비밀번호를 받을 곳: 'primary'(가입 이메일) 또는 'recovery'(복구 이메일)
  @IsIn(['primary', 'recovery'])
  destination: 'primary' | 'recovery';
}

export class UpdateRecoveryEmailDto {
  // 빈 문자열이면 복구 이메일 해제. 값이 있으면 이메일 형식 검증.
  @ValidateIf((o) => o.recoveryEmail !== '')
  @IsEmail({}, { message: '복구 이메일 형식이 올바르지 않습니다.' })
  @MaxLength(254)
  recoveryEmail: string;
}
