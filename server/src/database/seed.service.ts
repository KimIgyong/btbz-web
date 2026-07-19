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
    if (count > 0) return;

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
    this.logger.log(`Seeded initial admin account: ${email} (must change password on first login)`);
  }
}
