import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('page_views')
export class PageView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40, default: 'download' })
  page: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @Column({ length: 400, default: '' })
  userAgent: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
