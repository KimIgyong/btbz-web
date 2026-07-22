import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 254, unique: true })
  email: string;

  @Column({ length: 100 })
  passwordHash: string;

  // 비밀번호 분실 시 임시 비밀번호를 받을 복구 이메일(선택). 빈 문자열이면 미설정.
  @Column({ length: 254, default: '' })
  recoveryEmail: string;

  @Column({ default: true })
  mustChangePassword: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
