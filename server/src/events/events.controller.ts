import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Post,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { requestIp, requestUa } from '../common/request-ip';
import { DownloadEventDto, PageViewDto } from './events.dto';
import { EventsService } from './events.service';
import { StatsService } from './stats.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('download')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async download(@Body() dto: DownloadEventDto, @Req() req: Request): Promise<void> {
    await this.events.recordDownload(dto.file, dto.platform, dto.version, requestIp(req), requestUa(req));
  }

  @Post('pageview')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async pageview(@Body() dto: PageViewDto, @Req() req: Request): Promise<void> {
    await this.events.recordPageView(dto.page, requestIp(req), requestUa(req));
  }
}

@Controller('admin/stats')
@UseGuards(AdminAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('summary')
  summary() {
    return this.stats.summary();
  }

  @Get('events')
  events(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.stats.events(Math.max(1, page));
  }

  @Get('views')
  views(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.stats.views(Math.max(1, page));
  }
}
