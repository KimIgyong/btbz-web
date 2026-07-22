import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QnaPost } from './qna-post.entity';

export type QnaAttachmentKind = 'image' | 'file';

@Entity('qna_attachments')
export class QnaAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => QnaPost, (p) => p.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: QnaPost;

  @Column()
  postId: number;

  // 'image'(png/jpg — 인라인 표시) | 'file'(다운로드)
  @Column({ length: 10 })
  kind: QnaAttachmentKind;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 100 })
  storedName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @CreateDateColumn()
  createdAt: Date;
}
