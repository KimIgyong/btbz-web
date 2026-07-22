import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminUser,
  DownloadEvent,
  Inquiry,
  PageView,
  QnaAttachment,
  QnaPost,
  QnaReply,
  Review,
  Subscriber,
} from './entities';

export const ALL_ENTITIES = [
  AdminUser,
  DownloadEvent,
  Inquiry,
  PageView,
  QnaPost,
  QnaAttachment,
  QnaReply,
  Review,
  Subscriber,
];

/** in-memory SQLite 기반 테스트 모듈 */
export function createTestModule(metadata: ModuleMetadata): Promise<TestingModule> {
  return Test.createTestingModule({
    ...metadata,
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: ALL_ENTITIES,
        synchronize: true,
        dropSchema: true,
      }),
      TypeOrmModule.forFeature(ALL_ENTITIES),
      ...(metadata.imports ?? []),
    ],
  }).compile();
}
