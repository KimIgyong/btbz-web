import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 254, unique: true })
  email: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  unsubscribedAt: Date | null;
}
