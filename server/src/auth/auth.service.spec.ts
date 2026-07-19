import { JwtModule } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';
import { createTestModule } from '../test-utils';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let service: AuthService;
  let repo: Repository<AdminUser>;

  beforeEach(async () => {
    moduleRef = await createTestModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      providers: [AuthService],
    });
    service = moduleRef.get(AuthService);
    repo = moduleRef.get(getRepositoryToken(AdminUser));
    await repo.save(
      repo.create({
        email: 'a@btbz.ai',
        passwordHash: await bcrypt.hash('secret-1', 4),
        mustChangePassword: true,
      }),
    );
  });

  afterEach(() => moduleRef.close());

  it('올바른 자격증명으로 로그인하면 토큰과 mustChangePassword를 반환한다', async () => {
    const res = await service.login('a@btbz.ai', 'secret-1');
    expect(res.token).toBeTruthy();
    expect(res.mustChangePassword).toBe(true);
  });

  it('잘못된 비밀번호는 Unauthorized', async () => {
    await expect(service.login('a@btbz.ai', 'wrong')).rejects.toThrow('이메일 또는 비밀번호');
  });

  it('없는 계정도 Unauthorized', async () => {
    await expect(service.login('nobody@btbz.ai', 'secret-1')).rejects.toThrow();
  });

  it('비밀번호 변경 시 mustChangePassword가 해제된다', async () => {
    const user = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    await service.changePassword(user.id, 'secret-1', 'new-secret-8');
    const updated = await repo.findOneByOrFail({ id: user.id });
    expect(updated.mustChangePassword).toBe(false);
    expect(await bcrypt.compare('new-secret-8', updated.passwordHash)).toBe(true);
  });

  it('현재 비밀번호가 틀리면 변경 거부', async () => {
    const user = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    await expect(service.changePassword(user.id, 'wrong', 'new-secret-8')).rejects.toThrow('현재 비밀번호');
  });

  it('기존과 같은 비밀번호로는 변경 거부', async () => {
    const user = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    await expect(service.changePassword(user.id, 'secret-1', 'secret-1')).rejects.toThrow('기존 비밀번호와 같습니다');
  });
});
