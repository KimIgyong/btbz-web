import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { requestIp } from '../common/request-ip';
import { ReviewStatus } from '../entities/review.entity';
import { CreateReviewDto, UpdateReviewStatusDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.reviews.listPublic(Math.max(1, page));
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async create(@Body() dto: CreateReviewDto, @Req() req: Request): Promise<{ ok: boolean; pending: boolean }> {
    if (dto.website) return { ok: true, pending: true }; // honeypot
    await this.reviews.create(dto.nickname, dto.content, dto.rating, requestIp(req));
    return { ok: true, pending: true };
  }
}

@Controller('admin/reviews')
@UseGuards(AdminAuthGuard)
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: ReviewStatus,
  ) {
    const valid: ReviewStatus[] = ['pending', 'visible', 'hidden'];
    return this.reviews.listAdmin(Math.max(1, page), 20, status && valid.includes(status) ? status : undefined);
  }

  @Patch(':id')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewStatusDto) {
    return this.reviews.setStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.reviews.remove(id);
  }
}
