import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type InquiryStatus = 'new' | 'read' | 'handled';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 254 })
  senderEmail: string;

  @Column({ default: false })
  mailSent: boolean;

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: InquiryStatus;

  @Column({ length: 64, default: '' })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;
}
