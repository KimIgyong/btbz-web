import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// multipart/form-data — 텍스트 필드는 모두 문자열로 도착. rating은 서비스에서 파싱·클램프.
export class CreateQnaDto {
  @IsString()
  @MinLength(1, { message: '닉네임을 입력해 주세요.' })
  @MaxLength(40)
  nickname: string;

  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1, { message: '제목을 입력해 주세요.' })
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(50_000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  rating?: string; // '0'~'5'

  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string; // 허니팟
}

export class CreateQnaReplyDto {
  @IsString()
  @MinLength(1, { message: '답변 내용을 입력해 주세요.' })
  @MaxLength(10_000)
  body: string;
}

export class UpdateQnaStatusDto {
  @IsString()
  status: 'visible' | 'hidden';
}
