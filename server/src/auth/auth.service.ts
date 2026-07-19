import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';

export interface AdminTokenPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; mustChangePassword: boolean; email: string }> {
    const user = await this.adminUsers.findOneBy({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const payload: AdminTokenPayload = { sub: user.id, email: user.email };
    return {
      token: await this.jwt.signAsync(payload),
      mustChangePassword: user.mustChangePassword,
      email: user.email,
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.adminUsers.findOneBy({ id: userId });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('새 비밀번호가 기존 비밀번호와 같습니다.');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await this.adminUsers.save(user);
  }
}
