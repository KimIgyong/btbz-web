import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { requestIp } from '../common/request-ip';
import { SubscribeDto } from './subscribers.dto';
import { SubscribersService } from './subscribers.service';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribers: SubscribersService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request): Promise<{ ok: boolean }> {
    if (dto.website) return { ok: true }; // honeypot
    await this.subscribers.subscribe(dto.email, requestIp(req));
    return { ok: true };
  }
}

@Controller('admin/subscribers')
@UseGuards(AdminAuthGuard)
export class AdminSubscribersController {
  constructor(private readonly subscribers: SubscribersService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('search') search?: string,
  ) {
    return this.subscribers.list(Math.max(1, page), 50, search);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="subscribers.csv"')
  exportCsv() {
    return this.subscribers.exportCsv();
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.subscribers.remove(id);
  }
}
