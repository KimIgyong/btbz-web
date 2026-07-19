import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('download_events')
export class DownloadEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  file: string;

  @Index()
  @Column({ length: 20 })
  platform: string;

  @Column({ length: 20 })
  version: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @Column({ length: 400, default: '' })
  userAgent: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
