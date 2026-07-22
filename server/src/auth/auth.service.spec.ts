import { JwtModule } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';
import { MailService } from '../mail/mail.service';
import { createTestModule } from '../test-utils';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let service: AuthService;
  let repo: Repository<AdminUser>;
  let mail: { sendAdminTempPassword: jest.Mock };

  beforeEach(async () => {
    mail = { sendAdminTempPassword: jest.fn().mockResolvedValue(true) };
    moduleRef = await createTestModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      providers: [AuthService, { provide: MailService, useValue: mail }],
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

  it('복구 이메일을 등록/해제할 수 있다', async () => {
    const user = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    const set = await service.updateRecoveryEmail(user.id, 'Recover@Example.com');
    expect(set.recoveryEmail).toBe('recover@example.com');
    const cleared = await service.updateRecoveryEmail(user.id, '');
    expect(cleared.recoveryEmail).toBe('');
  });

  it('복구 이메일이 로그인 이메일과 같으면 거부', async () => {
    const user = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    await expect(service.updateRecoveryEmail(user.id, 'a@btbz.ai')).rejects.toThrow('로그인 이메일과 달라야');
  });

  it('분실 재발급: 임시 비밀번호로 교체되고 변경 강제, 메일 발송', async () => {
    await service.updateRecoveryEmail((await repo.findOneByOrFail({ email: 'a@btbz.ai' })).id, 'recover@example.com');
    await service.forgotPassword('a@btbz.ai', 'recovery');
    const updated = await repo.findOneByOrFail({ email: 'a@btbz.ai' });
    expect(updated.mustChangePassword).toBe(true);
    expect(await bcrypt.compare('secret-1', updated.passwordHash)).toBe(false); // 기존 비번 무효화
    expect(mail.sendAdminTempPassword).toHaveBeenCalledTimes(1);
    expect(mail.sendAdminTempPassword.mock.calls[0][0]).toBe('recover@example.com'); // 복구 이메일로 발송
  });

  it('분실 재발급: recovery 선택했으나 미설정이면 가입 이메일로 폴백', async () => {
    await service.forgotPassword('a@btbz.ai', 'recovery');
    expect(mail.sendAdminTempPassword.mock.calls[0][0]).toBe('a@btbz.ai');
  });

  it('분실 재발급: 없는 계정은 조용히 무시(열거 방지, 메일 없음)', async () => {
    await service.forgotPassword('nobody@btbz.ai', 'primary');
    expect(mail.sendAdminTempPassword).not.toHaveBeenCalled();
  });
});
