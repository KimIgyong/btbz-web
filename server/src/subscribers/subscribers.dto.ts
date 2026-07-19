import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  // honeypot
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
