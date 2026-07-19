import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 254, unique: true })
  email: string;

  @Column({ length: 100 })
  passwordHash: string;

  @Column({ default: true })
  mustChangePassword: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
