import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Review } from '../entities';
import { AdminReviewsController, ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), AuthModule],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
