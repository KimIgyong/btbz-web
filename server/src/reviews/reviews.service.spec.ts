import { TestingModule } from '@nestjs/testing';
import { createTestModule } from '../test-utils';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let moduleRef: TestingModule;
  let service: ReviewsService;

  beforeEach(async () => {
    moduleRef = await createTestModule({ providers: [ReviewsService] });
    service = moduleRef.get(ReviewsService);
  });

  afterEach(() => moduleRef.close());

  it('작성하면 pending 상태로 저장된다 (승인제)', async () => {
    const review = await service.create('nick', '좋아요', 5, '1.1.1.1');
    expect(review.status).toBe('pending');
  });

  it('공개 목록에는 visible만 노출되고 IP는 제외된다', async () => {
    const a = await service.create('a', 'pending 글', 4, '9.9.9.9');
    const b = await service.create('b', 'visible 글', 5, '9.9.9.9');
    await service.setStatus(b.id, 'visible');
    const c = await service.create('c', 'hidden 글', 1, '9.9.9.9');
    await service.setStatus(c.id, 'hidden');

    const { items, total } = await service.listPublic(1);
    expect(total).toBe(1);
    expect(items[0].content).toBe('visible 글');
    expect((items[0] as unknown as Record<string, unknown>).ip).toBeUndefined();
    expect(a.status).toBe('pending');
  });

  it('승인(pending→visible) 및 삭제', async () => {
    const review = await service.create('nick', '내용', 3, '');
    await service.setStatus(review.id, 'visible');
    expect((await service.listPublic(1)).total).toBe(1);
    await service.remove(review.id);
    expect((await service.listPublic(1)).total).toBe(0);
  });

  it('어드민 목록은 상태 필터를 지원한다', async () => {
    await service.create('a', 'x', 1, '');
    const b = await service.create('b', 'y', 2, '');
    await service.setStatus(b.id, 'visible');
    expect((await service.listAdmin(1, 20, 'pending')).total).toBe(1);
    expect((await service.listAdmin(1, 20)).total).toBe(2);
  });
});
