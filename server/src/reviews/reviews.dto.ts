import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  // honeypot
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateReviewStatusDto {
  @IsIn(['pending', 'visible', 'hidden'])
  status: 'pending' | 'visible' | 'hidden';
}
