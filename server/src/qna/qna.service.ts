import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { isEmptyRichText, sanitizeRichText } from '../common/sanitize';
import { QnaAttachment, QnaPost, QnaReply } from '../entities';
import { QnaStatus } from '../entities/qna-post.entity';
import { CreateQnaDto } from './qna.dto';
import { attachmentKind, UPLOAD_DIR, writeUpload } from './qna.storage';

export interface PublicAttachment {
  id: number;
  kind: 'image' | 'file';
  originalName: string;
  size: number;
  url: string;
}
export interface PublicReply {
  id: number;
  body: string;
  author: string;
  createdAt: Date;
}
export interface PublicQnaPost {
  id: number;
  nickname: string;
  title: string;
  contentHtml: string;
  rating: number;
  createdAt: Date;
  attachments: PublicAttachment[];
  replies: PublicReply[];
}

function clampRating(raw?: string): number {
  const n = parseInt(raw ?? '0', 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(5, Math.max(0, n));
}

function toPublicAttachment(a: QnaAttachment): PublicAttachment {
  return { id: a.id, kind: a.kind, originalName: a.originalName, size: a.size, url: `/api/qna/attachments/${a.id}` };
}
function toPublicReply(r: QnaReply): PublicReply {
  return { id: r.id, body: r.body, author: r.author, createdAt: r.createdAt };
}
function toPublic(p: QnaPost): PublicQnaPost {
  return {
    id: p.id,
    nickname: p.nickname,
    title: p.title,
    contentHtml: p.contentHtml,
    rating: p.rating,
    createdAt: p.createdAt,
    attachments: (p.attachments ?? []).map(toPublicAttachment),
    replies: (p.replies ?? []).sort((a, b) => a.id - b.id).map(toPublicReply),
  };
}

@Injectable()
export class QnaService {
  constructor(
    @InjectRepository(QnaPost) private readonly posts: Repository<QnaPost>,
    @InjectRepository(QnaAttachment) private readonly attachments: Repository<QnaAttachment>,
    @InjectRepository(QnaReply) private readonly replies: Repository<QnaReply>,
  ) {}

  /** 질문 작성 — 즉시 공개(visible). 리치텍스트 새니타이즈 + 첨부 저장. */
  async create(dto: CreateQnaDto, files: Express.Multer.File[], ip: string): Promise<{ ok: true; id: number }> {
    const contentHtml = sanitizeRichText(dto.content);
    const hasFiles = (files ?? []).length > 0;
    if (isEmptyRichText(contentHtml) && !hasFiles) {
      throw new BadRequestException('내용을 입력하거나 파일을 첨부해 주세요.');
    }
    const post = await this.posts.save(
      this.posts.create({
        nickname: dto.nickname.trim(),
        email: dto.email.toLowerCase().trim(),
        title: dto.title.trim(),
        contentHtml,
        rating: clampRating(dto.rating),
        ip,
      }),
    );
    for (const f of files ?? []) {
      const storedName = writeUpload(f);
      await this.attachments.save(
        this.attachments.create({
          postId: post.id,
          kind: attachmentKind(f.mimetype),
          originalName: f.originalname.slice(0, 255),
          storedName,
          mimeType: (f.mimetype || 'application/octet-stream').slice(0, 100),
          size: f.size,
        }),
      );
    }
    return { ok: true, id: post.id };
  }

  /** 공개 목록 — visible만, email/ip 제외, 첨부·답변 포함 */
  async listPublic(page: number, pageSize = 10): Promise<{ items: PublicQnaPost[]; total: number }> {
    const [items, total] = await this.posts.findAndCount({
      where: { status: 'visible' },
      relations: { attachments: true, replies: true },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: items.map(toPublic), total };
  }

  async getPublic(id: number): Promise<PublicQnaPost> {
    const post = await this.posts.findOne({
      where: { id, status: 'visible' },
      relations: { attachments: true, replies: true },
    });
    if (!post) throw new NotFoundException();
    return toPublic(post);
  }

  /** 첨부 서빙용 조회 (파일 경로 포함) */
  async getAttachment(id: number): Promise<{ attachment: QnaAttachment; path: string }> {
    const attachment = await this.attachments.findOne({ where: { id }, relations: { post: true } });
    if (!attachment || attachment.post?.status !== 'visible') throw new NotFoundException();
    return { attachment, path: join(UPLOAD_DIR, attachment.storedName) };
  }

  // ── 관리자 ──
  async listAdmin(page: number, pageSize = 20, status?: QnaStatus): Promise<{ items: QnaPost[]; total: number }> {
    const [items, total] = await this.posts.findAndCount({
      where: status ? { status } : {},
      relations: { attachments: true, replies: true },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async setStatus(id: number, status: QnaStatus): Promise<QnaPost> {
    const post = await this.getEntity(id);
    post.status = status === 'hidden' ? 'hidden' : 'visible';
    return this.posts.save(post);
  }

  /** 삭제 — 디스크의 첨부 파일도 제거 후 글 삭제(첨부·답변은 CASCADE) */
  async remove(id: number): Promise<void> {
    const post = await this.posts.findOne({ where: { id }, relations: { attachments: true } });
    if (!post) throw new NotFoundException();
    for (const a of post.attachments ?? []) {
      await unlink(join(UPLOAD_DIR, a.storedName)).catch(() => undefined);
    }
    await this.posts.remove(post);
  }

  async addReply(postId: number, body: string): Promise<QnaReply> {
    await this.getEntity(postId);
    return this.replies.save(this.replies.create({ postId, body: body.trim(), author: 'BTBZ' }));
  }

  async removeReply(id: number): Promise<void> {
    const reply = await this.replies.findOneBy({ id });
    if (!reply) throw new NotFoundException();
    await this.replies.remove(reply);
  }

  private async getEntity(id: number): Promise<QnaPost> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException();
    return post;
  }
}
