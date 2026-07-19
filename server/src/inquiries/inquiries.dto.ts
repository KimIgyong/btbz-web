import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsEmail()
  @MaxLength(254)
  senderEmail: string;

  // honeypot — 봇이 채우는 숨김 필드, 사람은 비워 둠
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateInquiryStatusDto {
  @IsIn(['new', 'read', 'handled'])
  status: 'new' | 'read' | 'handled';
}
