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

// 관리자(개발자) 답변 전용. 본문은 평문으로 저장하고 렌더 시 escape + 줄바꿈 유지.
@Entity('qna_replies')
export class QnaReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => QnaPost, (p) => p.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: QnaPost;

  @Column()
  postId: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 40, default: 'BTBZ' })
  author: string;

  @CreateDateColumn()
  createdAt: Date;
}
