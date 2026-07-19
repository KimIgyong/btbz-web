import {
  Body,
  Controller,
  DefaultValuePipe,
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
import { CreateInquiryDto, UpdateInquiryStatusDto } from './inquiries.dto';
import { InquiriesService } from './inquiries.service';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async create(@Body() dto: CreateInquiryDto, @Req() req: Request): Promise<{ ok: boolean }> {
    if (dto.website) return { ok: true }; // honeypot — 조용히 무시
    await this.inquiries.create(dto.subject, dto.body, dto.senderEmail, requestIp(req));
    return { ok: true };
  }
}

@Controller('admin/inquiries')
@UseGuards(AdminAuthGuard)
export class AdminInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get()
  list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.inquiries.list(Math.max(1, page));
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.inquiries.get(id);
  }

  @Patch(':id')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInquiryStatusDto) {
    return this.inquiries.setStatus(id, dto.status);
  }
}
