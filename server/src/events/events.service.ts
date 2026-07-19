import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DownloadEvent, PageView } from '../entities';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(DownloadEvent)
    private readonly downloads: Repository<DownloadEvent>,
    @InjectRepository(PageView)
    private readonly pageViews: Repository<PageView>,
  ) {}

  /** 기록 실패가 다운로드를 막지 않도록 예외를 삼킨다(FR-7) */
  async recordDownload(file: string, platform: string, version: string, ip: string, userAgent: string): Promise<void> {
    try {
      await this.downloads.save(this.downloads.create({ file, platform, version, ip, userAgent }));
    } catch (err) {
      this.logger.error(`download event save failed: ${(err as Error).message}`);
    }
  }

  async recordPageView(page: string, ip: string, userAgent: string): Promise<void> {
    try {
      await this.pageViews.save(this.pageViews.create({ page, ip, userAgent }));
    } catch (err) {
      this.logger.error(`page view save failed: ${(err as Error).message}`);
    }
  }
}
