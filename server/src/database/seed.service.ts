import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.adminUsers.count();
    if (count > 0) {
      await this.backfillRecoveryEmail();
      return;
    }

    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@btbz.ai';
    let password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      password = randomBytes(9).toString('base64url');
      // 시드 비밀번호 미설정 시 1회성 랜덤 발급 — 로그로만 전달
      this.logger.warn(`SEED_ADMIN_PASSWORD not set. Generated one-time password for ${email}: ${password}`);
    }
    await this.adminUsers.save(
      this.adminUsers.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: true,
      }),
    );
    // 신규 시드 계정에도 복구 이메일 기본값 지정
    const recovery = (process.env.SEED_ADMIN_RECOVERY_EMAIL ?? 'fremdung@gmail.com').toLowerCase().trim();
    if (recovery && recovery !== email.toLowerCase().trim()) {
      const seeded = await this.adminUsers.findOneBy({ email });
      if (seeded) {
        seeded.recoveryEmail = recovery;
        await this.adminUsers.save(seeded);
      }
    }
    this.logger.log(`Seeded initial admin account: ${email} (must change password on first login)`);
  }

  /**
   * 기존 배포 계정에 복구 이메일이 비어 있으면 기본값(SEED_ADMIN_RECOVERY_EMAIL,
   * 기본 fremdung@gmail.com)을 첫 관리자에게 1회 백필. 요구사항: 현재 관리자에 복구이메일 등록.
   */
  private async backfillRecoveryEmail(): Promise<void> {
    const recovery = (process.env.SEED_ADMIN_RECOVERY_EMAIL ?? 'fremdung@gmail.com').toLowerCase().trim();
    if (!recovery) return;
    const first = await this.adminUsers.findOne({ order: { id: 'ASC' }, where: {} });
    if (first && !first.recoveryEmail && first.email.toLowerCase().trim() !== recovery) {
      first.recoveryEmail = recovery;
      await this.adminUsers.save(first);
      this.logger.log(`Backfilled recovery email for admin #${first.id}.`);
    }
  }
}
