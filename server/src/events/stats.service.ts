import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DownloadEvent, PageView } from '../entities';

// 집계 기준: KST(UTC+9) 일 단위 — DB에는 UTC로 저장됨
const KST = `'+9 hours'`;

export interface StatsSummary {
  totals: { today: number; last7d: number; last30d: number; all: number; pageViewsAll: number };
  byPlatform: { platform: string; count: number }[];
  byVersion: { version: string; count: number }[];
  daily: { date: string; count: number }[];
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(DownloadEvent)
    private readonly downloads: Repository<DownloadEvent>,
    @InjectRepository(PageView)
    private readonly pageViews: Repository<PageView>,
  ) {}

  async summary(): Promise<StatsSummary> {
    const one = async (q: string): Promise<number> =>
      Number((await this.downloads.query(q))[0]?.c ?? 0);

    const today = await one(
      `SELECT COUNT(*) c FROM download_events WHERE date(datetime(createdAt, ${KST})) = date(datetime('now', ${KST}))`,
    );
    const last7d = await one(
      `SELECT COUNT(*) c FROM download_events WHERE createdAt >= datetime('now', '-7 days')`,
    );
    const last30d = await one(
      `SELECT COUNT(*) c FROM download_events WHERE createdAt >= datetime('now', '-30 days')`,
    );
    const all = await one(`SELECT COUNT(*) c FROM download_events`);
    const pageViewsAll = Number((await this.pageViews.query(`SELECT COUNT(*) c FROM page_views`))[0]?.c ?? 0);

    const byPlatform = (await this.downloads.query(
      `SELECT platform, COUNT(*) count FROM download_events GROUP BY platform ORDER BY count DESC`,
    )) as { platform: string; count: number }[];
    const byVersion = (await this.downloads.query(
      `SELECT version, COUNT(*) count FROM download_events GROUP BY version ORDER BY version DESC`,
    )) as { version: string; count: number }[];
    const daily = (await this.downloads.query(
      `SELECT date(datetime(createdAt, ${KST})) date, COUNT(*) count
         FROM download_events
        WHERE createdAt >= datetime('now', '-30 days')
        GROUP BY date ORDER BY date`,
    )) as { date: string; count: number }[];

    return {
      totals: { today, last7d, last30d, all, pageViewsAll },
      byPlatform: byPlatform.map((r) => ({ ...r, count: Number(r.count) })),
      byVersion: byVersion.map((r) => ({ ...r, count: Number(r.count) })),
      daily: daily.map((r) => ({ ...r, count: Number(r.count) })),
    };
  }

  async events(page: number, pageSize = 50): Promise<{ items: DownloadEvent[]; total: number }> {
    const [items, total] = await this.downloads.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async views(page: number, pageSize = 50): Promise<{ items: PageView[]; total: number }> {
    const [items, total] = await this.pageViews.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }
}
