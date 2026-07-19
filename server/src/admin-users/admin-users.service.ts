import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';

export interface AdminUserView {
  id: number;
  email: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toView({ id, email, mustChangePassword, createdAt, updatedAt }: AdminUser): AdminUserView {
  return { id, email, mustChangePassword, createdAt, updatedAt };
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
  ) {}

  async list(): Promise<AdminUserView[]> {
    return (await this.adminUsers.find({ order: { id: 'ASC' } })).map(toView);
  }

  /** 추가 — 임시 비밀번호 자동 생성, 응답에서 1회만 노출(FR-18) */
  async create(email: string): Promise<{ user: AdminUserView; tempPassword: string }> {
    const normalized = email.toLowerCase().trim();
    if (await this.adminUsers.findOneBy({ email: normalized })) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }
    const tempPassword = randomBytes(9).toString('base64url');
    const user = await this.adminUsers.save(
      this.adminUsers.create({
        email: normalized,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
      }),
    );
    return { user: toView(user), tempPassword };
  }

  async updateEmail(id: number, email: string): Promise<AdminUserView> {
    const user = await this.getEntity(id);
    const normalized = email.toLowerCase().trim();
    const dup = await this.adminUsers.findOneBy({ email: normalized });
    if (dup && dup.id !== id) throw new ConflictException('이미 존재하는 이메일입니다.');
    user.email = normalized;
    return toView(await this.adminUsers.save(user));
  }

  /** 임시 비밀번호 부여 — 다음 로그인 시 변경 강제(FR-18) */
  async issueTempPassword(id: number): Promise<{ user: AdminUserView; tempPassword: string }> {
    const user = await this.getEntity(id);
    const tempPassword = randomBytes(9).toString('base64url');
    user.passwordHash = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    return { user: toView(await this.adminUsers.save(user)), tempPassword };
  }

  /** 삭제 — 마지막 관리자·본인 삭제 금지(FR-18) */
  async remove(id: number, requesterId: number): Promise<void> {
    if (id === requesterId) throw new BadRequestException('본인 계정은 삭제할 수 없습니다.');
    const user = await this.getEntity(id);
    if ((await this.adminUsers.count()) <= 1) {
      throw new BadRequestException('마지막 관리자 계정은 삭제할 수 없습니다.');
    }
    await this.adminUsers.remove(user);
  }

  private async getEntity(id: number): Promise<AdminUser> {
    const user = await this.adminUsers.findOneBy({ id });
    if (!user) throw new NotFoundException();
    return user;
  }
}
