import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities';
import { InquiryStatus } from '../entities/inquiry.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiries: Repository<Inquiry>,
    private readonly mail: MailService,
  ) {}

  /** 저장 후 메일 발송 — 메일 실패해도 저장은 유지(FR-3) */
  async create(subject: string, body: string, senderEmail: string, ip: string): Promise<Inquiry> {
    const inquiry = await this.inquiries.save(
      this.inquiries.create({ subject, body, senderEmail, ip }),
    );
    const sent = await this.mail.sendInquiry(subject, body, senderEmail);
    if (sent) {
      inquiry.mailSent = true;
      await this.inquiries.save(inquiry);
    }
    return inquiry;
  }

  async list(page: number, pageSize = 20): Promise<{ items: Inquiry[]; total: number }> {
    const [items, total] = await this.inquiries.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async get(id: number): Promise<Inquiry> {
    const inquiry = await this.inquiries.findOneBy({ id });
    if (!inquiry) throw new NotFoundException();
    return inquiry;
  }

  async setStatus(id: number, status: InquiryStatus): Promise<Inquiry> {
    const inquiry = await this.get(id);
    inquiry.status = status;
    return this.inquiries.save(inquiry);
  }
}
