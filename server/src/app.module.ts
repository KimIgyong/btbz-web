import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AuthModule } from './auth/auth.module';
import { SeedService } from './database/seed.service';
import { EventsModule } from './events/events.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { AdminUser, DownloadEvent, Inquiry, PageView, Review, Subscriber } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? 'btbz-cms.sqlite',
      entities: [AdminUser, DownloadEvent, Inquiry, PageView, Review, Subscriber],
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      migrationsRun: true,
      synchronize: false,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forFeature([AdminUser]),
    AuthModule,
    InquiriesModule,
    EventsModule,
    SubscribersModule,
    ReviewsModule,
    AdminUsersModule,
  ],
  providers: [SeedService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
