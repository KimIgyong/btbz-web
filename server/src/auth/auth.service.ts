import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';
import { MailService } from '../mail/mail.service';

export interface AdminTokenPayload {
  sub: number;
  email: string;
}

export interface AdminMeView {
  id: number;
  email: string;
  recoveryEmail: string;
  mustChangePassword: boolean;
}

function toMe({ id, email, recoveryEmail, mustChangePassword }: AdminUser): AdminMeView {
  return { id, email, recoveryEmail, mustChangePassword };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
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

  /** 현재 로그인 관리자 정보(복구 이메일 포함) */
  getMe(user: AdminUser): AdminMeView {
    return toMe(user);
  }

  /** 복구 이메일 등록/변경/해제(빈 문자열이면 해제) */
  async updateRecoveryEmail(userId: number, recoveryEmail: string): Promise<AdminMeView> {
    const user = await this.adminUsers.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    const normalized = recoveryEmail.toLowerCase().trim();
    if (normalized && normalized === user.email) {
      throw new BadRequestException('복구 이메일은 로그인 이메일과 달라야 합니다.');
    }
    user.recoveryEmail = normalized;
    return toMe(await this.adminUsers.save(user));
  }

  /**
   * 비밀번호 분실 재발급 — 임시 비밀번호를 생성해 선택한 이메일로 발송.
   * 계정 존재 여부를 노출하지 않도록 항상 동일하게 성공 처리(사용자 열거 방지).
   * 임시 비밀번호는 절대 HTTP 응답에 담지 않는다(이메일 전용).
   */
  async forgotPassword(email: string, destination: 'primary' | 'recovery'): Promise<void> {
    const user = await this.adminUsers.findOneBy({ email: email.toLowerCase().trim() });
    if (!user) {
      this.logger.warn(`Forgot-password requested for unknown email (ignored).`);
      return; // 열거 방지: 존재하지 않아도 동일 응답
    }

    // 목적지 결정: recovery 선택 시 복구 이메일, 없으면 가입 이메일로 폴백
    const target =
      destination === 'recovery' && user.recoveryEmail ? user.recoveryEmail : user.email;

    const tempPassword = randomBytes(9).toString('base64url');
    user.passwordHash = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    await this.adminUsers.save(user);

    const sent = await this.mail.sendAdminTempPassword(target, tempPassword, user.email);
    this.logger.log(
      `Forgot-password temp issued for admin #${user.id} → ${destination} (mail sent=${sent}).`,
    );
  }
}
