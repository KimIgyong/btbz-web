import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AdminUser, DownloadEvent, Inquiry, PageView, Review, Subscriber } from '../entities';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_PATH ?? 'btbz-cms.sqlite',
  entities: [AdminUser, DownloadEvent, Inquiry, PageView, Review, Subscriber],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
