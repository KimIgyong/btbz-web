import { IsEmail, MaxLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class UpdateAdminUserDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
