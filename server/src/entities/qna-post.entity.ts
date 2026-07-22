import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QnaAttachment } from './qna-attachment.entity';
import { QnaReply } from './qna-reply.entity';

export type QnaStatus = 'visible' | 'hidden';

@Entity('qna_posts')
export class QnaPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  nickname: string;

  // 비공개(연락용) — 공개 응답에서 제외
  @Column({ length: 254 })
  email: string;

  @Column({ length: 200 })
  title: string;

  // 서버에서 새니타이즈된 리치텍스트 HTML
  @Column({ type: 'text' })
  contentHtml: string;

  // 0 = 별점 없음, 1~5
  @Column({ type: 'int', default: 0 })
  rating: number;

  @Index()
  @Column({ type: 'varchar', length: 10, default: 'visible' })
  status: QnaStatus;

  @Column({ length: 64, default: '' })
  ip: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => QnaAttachment, (a) => a.post)
  attachments: QnaAttachment[];

  @OneToMany(() => QnaReply, (r) => r.post)
  replies: QnaReply[];
}
