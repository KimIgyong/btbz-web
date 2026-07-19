import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReviewStatus = 'pending' | 'visible' | 'hidden';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  nickname: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  rating: number;

  @Index()
  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: ReviewStatus;

  @Column({ length: 64, default: '' })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;
}
