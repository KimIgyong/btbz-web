import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../entities';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscribers: Repository<Subscriber>,
  ) {}

  /** 중복 이메일은 기존 1건 유지(FR-9), 재구독 시 unsubscribedAt 해제 */
  async subscribe(email: string, ip: string): Promise<Subscriber> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.subscribers.findOneBy({ email: normalized });
    if (existing) {
      if (existing.unsubscribedAt) {
        existing.unsubscribedAt = null;
        return this.subscribers.save(existing);
      }
      return existing;
    }
    return this.subscribers.save(this.subscribers.create({ email: normalized, ip }));
  }

  async list(page: number, pageSize = 50, search?: string): Promise<{ items: Subscriber[]; total: number }> {
    const qb = this.subscribers.createQueryBuilder('s').orderBy('s.id', 'DESC');
    if (search) qb.where('s.email LIKE :q', { q: `%${search}%` });
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total };
  }

  async remove(id: number): Promise<void> {
    const found = await this.subscribers.findOneBy({ id });
    if (!found) throw new NotFoundException();
    await this.subscribers.remove(found);
  }

  async exportCsv(): Promise<string> {
    const all = await this.subscribers.find({ order: { id: 'ASC' } });
    const lines = ['email,createdAt,unsubscribedAt'];
    for (const s of all) {
      lines.push(`${s.email},${s.createdAt.toISOString()},${s.unsubscribedAt ? s.unsubscribedAt.toISOString() : ''}`);
    }
    return lines.join('\n') + '\n';
  }
}
