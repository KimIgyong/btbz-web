import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';
import { createTestModule } from '../test-utils';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let moduleRef: TestingModule;
  let service: AdminUsersService;
  let repo: Repository<AdminUser>;
  let firstId: number;

  beforeEach(async () => {
    moduleRef = await createTestModule({ providers: [AdminUsersService] });
    service = moduleRef.get(AdminUsersService);
    repo = moduleRef.get(getRepositoryToken(AdminUser));
    const first = await repo.save(
      repo.create({ email: 'admin@btbz.ai', passwordHash: 'x', mustChangePassword: false }),
    );
    firstId = first.id;
  });

  afterEach(() => moduleRef.close());

  it('추가 시 임시 비밀번호를 1회 반환하고 해시로 저장한다', async () => {
    const { user, tempPassword } = await service.create('second@btbz.ai');
    expect(tempPassword.length).toBeGreaterThanOrEqual(10);
    expect(user.mustChangePassword).toBe(true);
    const saved = await repo.findOneByOrFail({ id: user.id });
    expect(saved.passwordHash).not.toContain(tempPassword);
    expect(await bcrypt.compare(tempPassword, saved.passwordHash)).toBe(true);
  });

  it('중복 이메일 추가는 Conflict', async () => {
    await expect(service.create('admin@btbz.ai')).rejects.toThrow('이미 존재');
  });

  it('임시 비밀번호 부여 시 mustChangePassword=true', async () => {
    const { tempPassword } = await service.issueTempPassword(firstId);
    const saved = await repo.findOneByOrFail({ id: firstId });
    expect(saved.mustChangePassword).toBe(true);
    expect(await bcrypt.compare(tempPassword, saved.passwordHash)).toBe(true);
  });

  it('마지막 관리자 삭제는 거부된다', async () => {
    await expect(service.remove(firstId, 999)).rejects.toThrow('마지막 관리자');
  });

  it('본인 삭제는 거부된다', async () => {
    await service.create('second@btbz.ai');
    await expect(service.remove(firstId, firstId)).rejects.toThrow('본인 계정');
  });

  it('다른 계정이 있으면 삭제 가능', async () => {
    const { user } = await service.create('second@btbz.ai');
    await service.remove(user.id, firstId);
    expect(await repo.count()).toBe(1);
  });
});
