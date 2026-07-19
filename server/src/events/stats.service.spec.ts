import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DownloadEvent } from '../entities';
import { createTestModule } from '../test-utils';
import { EventsService } from './events.service';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let moduleRef: TestingModule;
  let stats: StatsService;
  let events: EventsService;
  let repo: Repository<DownloadEvent>;

  beforeEach(async () => {
    moduleRef = await createTestModule({ providers: [StatsService, EventsService] });
    stats = moduleRef.get(StatsService);
    events = moduleRef.get(EventsService);
    repo = moduleRef.get(getRepositoryToken(DownloadEvent));
  });

  afterEach(() => moduleRef.close());

  it('플랫폼·버전별 집계와 총계가 정확하다', async () => {
    await events.recordDownload('ModoraSetup-1.1.2.exe', 'windows', '1.1.2', '1.1.1.1', 'ua');
    await events.recordDownload('ModoraSetup-1.1.2.exe', 'windows', '1.1.2', '2.2.2.2', 'ua');
    await events.recordDownload('Modora-1.1.2.apk', 'android', '1.1.2', '3.3.3.3', 'ua');
    // 40일 전 이벤트 — last30d에서 제외되어야 함
    await repo.query(
      `INSERT INTO download_events (file, platform, version, ip, userAgent, createdAt)
       VALUES ('old.dmg', 'macos', '1.0.0', '', '', datetime('now', '-40 days'))`,
    );

    const s = await stats.summary();
    expect(s.totals.all).toBe(4);
    expect(s.totals.last30d).toBe(3);
    expect(s.totals.today).toBe(3);
    expect(s.byPlatform.find((p) => p.platform === 'windows')?.count).toBe(2);
    expect(s.byPlatform.find((p) => p.platform === 'macos')?.count).toBe(1);
    expect(s.byVersion.find((v) => v.version === '1.1.2')?.count).toBe(3);
  });

  it('원본 로그 페이지네이션', async () => {
    await events.recordDownload('a.exe', 'windows', '1.1.2', '1.1.1.1', 'ua');
    const { items, total } = await stats.events(1);
    expect(total).toBe(1);
    expect(items[0].ip).toBe('1.1.1.1');
  });

  it('기록 실패는 예외를 던지지 않는다 (FR-7)', async () => {
    jest.spyOn(repo, 'save').mockRejectedValue(new Error('disk full'));
    await expect(
      events.recordDownload('a.exe', 'windows', '1.1.2', '', ''),
    ).resolves.toBeUndefined();
  });
});
