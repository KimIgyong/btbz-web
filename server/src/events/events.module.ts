import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DownloadEvent, PageView } from '../entities';
import { EventsController, StatsController } from './events.controller';
import { EventsService } from './events.service';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([DownloadEvent, PageView]), AuthModule],
  controllers: [EventsController, StatsController],
  providers: [EventsService, StatsService],
})
export class EventsModule {}
