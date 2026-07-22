import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QnaAttachment, QnaPost, QnaReply } from '../entities';
import { createTestModule } from '../test-utils';
import { CreateQnaDto } from './qna.dto';
import { QnaService } from './qna.service';

function dto(over: Partial<CreateQnaDto> = {}): CreateQnaDto {
  return { nickname: '홍길동', email: 'A@B.com', title: '질문', content: '<p>hi</p>', ...over };
}

describe('QnaService', () => {
  let moduleRef: TestingModule;
  let service: QnaService;
  let posts: Repository<QnaPost>;
  let replies: Repository<QnaReply>;

  beforeEach(async () => {
    moduleRef = await createTestModule({ providers: [QnaService] });
    service = moduleRef.get(QnaService);
    posts = moduleRef.get(getRepositoryToken(QnaPost));
    replies = moduleRef.get(getRepositoryToken(QnaReply));
  });
  afterEach(() => moduleRef.close());

  it('작성 시 스크립트를 제거하고 이메일을 소문자화한다', async () => {
    const res = await service.create(dto({ content: '<p>hello<script>alert(1)</script></p>' }), [], '1.2.3.0');
    const saved = await posts.findOneByOrFail({ id: res.id });
    expect(saved.contentHtml).not.toContain('<script>');
    expect(saved.contentHtml).toContain('hello');
    expect(saved.email).toBe('a@b.com');
    expect(saved.status).toBe('visible');
  });

  it('내용도 첨부도 없으면 거부', async () => {
    await expect(service.create(dto({ content: '<p>   </p>' }), [], '')).rejects.toThrow('내용을 입력');
  });

  it('별점은 0~5로 클램프된다', async () => {
    const a = await service.create(dto({ rating: '9' }), [], '');
    expect((await posts.findOneByOrFail({ id: a.id })).rating).toBe(5);
    const b = await service.create(dto({ rating: 'x' }), [], '');
    expect((await posts.findOneByOrFail({ id: b.id })).rating).toBe(0);
  });

  it('공개 목록은 hidden 글과 email/ip를 제외한다', async () => {
    const v = await service.create(dto({ title: '보임' }), [], '9.9.9.9');
    const h = await service.create(dto({ title: '숨김' }), [], '');
    await service.setStatus(h.id, 'hidden');
    const list = await service.listPublic(1);
    expect(list.total).toBe(1);
    expect(list.items[0].title).toBe('보임');
    expect(list.items[0]).not.toHaveProperty('email');
    expect(list.items[0]).not.toHaveProperty('ip');
    expect(list.items[0].id).toBe(v.id);
  });

  it('관리자 답변을 추가/삭제할 수 있고 공개 응답에 노출된다', async () => {
    const p = await service.create(dto(), [], '');
    const r = await service.addReply(p.id, '답변드립니다');
    let pub = await service.getPublic(p.id);
    expect(pub.replies).toHaveLength(1);
    expect(pub.replies[0].body).toBe('답변드립니다');
    expect(pub.replies[0].author).toBe('BTBZ');
    await service.removeReply(r.id);
    pub = await service.getPublic(p.id);
    expect(pub.replies).toHaveLength(0);
  });

  it('삭제 시 답변도 함께 사라진다(CASCADE)', async () => {
    const p = await service.create(dto(), [], '');
    await service.addReply(p.id, '답변');
    await service.remove(p.id);
    expect(await posts.count()).toBe(0);
    expect(await replies.count()).toBe(0);
  });

  it('숨김 글은 공개 조회에서 404', async () => {
    const p = await service.create(dto(), [], '');
    await service.setStatus(p.id, 'hidden');
    await expect(service.getPublic(p.id)).rejects.toThrow();
  });
});
