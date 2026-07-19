import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Subscriber } from '../entities';
import { AdminSubscribersController, SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber]), AuthModule],
  controllers: [SubscribersController, AdminSubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
