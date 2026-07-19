import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminUser } from '../entities';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser]), AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
