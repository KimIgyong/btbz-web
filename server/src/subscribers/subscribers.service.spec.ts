import { TestingModule } from '@nestjs/testing';
import { createTestModule } from '../test-utils';
import { SubscribersService } from './subscribers.service';

describe('SubscribersService', () => {
  let moduleRef: TestingModule;
  let service: SubscribersService;

  beforeEach(async () => {
    moduleRef = await createTestModule({ providers: [SubscribersService] });
    service = moduleRef.get(SubscribersService);
  });

  afterEach(() => moduleRef.close());

  it('중복 이메일은 1건만 유지된다 (FR-9)', async () => {
    await service.subscribe('User@Example.com', '1.1.1.1');
    await service.subscribe('user@example.com', '2.2.2.2');
    const { total, items } = await service.list(1);
    expect(total).toBe(1);
    expect(items[0].email).toBe('user@example.com');
  });

  it('구독 해지 후 재구독하면 unsubscribedAt이 해제된다', async () => {
    const sub = await service.subscribe('a@b.com', '');
    sub.unsubscribedAt = new Date();
    await service.subscribe('a@b.com', '');
    const { items } = await service.list(1);
    expect(items[0].unsubscribedAt).toBeNull();
  });

  it('CSV 내보내기에 헤더와 이메일이 포함된다', async () => {
    await service.subscribe('a@b.com', '');
    const csv = await service.exportCsv();
    expect(csv.startsWith('email,createdAt,unsubscribedAt')).toBe(true);
    expect(csv).toContain('a@b.com');
  });
});
