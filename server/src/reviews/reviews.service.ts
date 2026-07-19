import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities';
import { ReviewStatus } from '../entities/review.entity';

export interface PublicReview {
  id: number;
  nickname: string;
  content: string;
  rating: number;
  createdAt: Date;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  /** 작성 → 승인 대기(pending) 상태로 저장(FR-11, Q-4 확정) */
  create(nickname: string, content: string, rating: number, ip: string): Promise<Review> {
    return this.reviews.save(this.reviews.create({ nickname, content, rating, ip }));
  }

  /** 공개 목록 — visible 만, IP 등 내부 필드 제외 */
  async listPublic(page: number, pageSize = 10): Promise<{ items: PublicReview[]; total: number }> {
    const [items, total] = await this.reviews.findAndCount({
      where: { status: 'visible' },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: items.map(({ id, nickname, content, rating, createdAt }) => ({ id, nickname, content, rating, createdAt })),
      total,
    };
  }

  async listAdmin(page: number, pageSize = 20, status?: ReviewStatus): Promise<{ items: Review[]; total: number }> {
    const [items, total] = await this.reviews.findAndCount({
      where: status ? { status } : {},
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async setStatus(id: number, status: ReviewStatus): Promise<Review> {
    const review = await this.reviews.findOneBy({ id });
    if (!review) throw new NotFoundException();
    review.status = status;
    return this.reviews.save(review);
  }

  async remove(id: number): Promise<void> {
    const review = await this.reviews.findOneBy({ id });
    if (!review) throw new NotFoundException();
    await this.reviews.remove(review);
  }
}
