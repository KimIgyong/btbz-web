import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1753000000000 implements MigrationInterface {
  name = 'Init1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inquiries" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "subject" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "senderEmail" varchar(254) NOT NULL,
        "mailSent" boolean NOT NULL DEFAULT (0),
        "status" varchar(10) NOT NULL DEFAULT ('new'),
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`);
    await queryRunner.query(`
      CREATE TABLE "download_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "file" varchar(120) NOT NULL,
        "platform" varchar(20) NOT NULL,
        "version" varchar(20) NOT NULL,
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "userAgent" varchar(400) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_download_events_platform" ON "download_events" ("platform")`);
    await queryRunner.query(`CREATE INDEX "IDX_download_events_createdAt" ON "download_events" ("createdAt")`);
    await queryRunner.query(`
      CREATE TABLE "page_views" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "page" varchar(40) NOT NULL DEFAULT ('download'),
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "userAgent" varchar(400) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_page_views_createdAt" ON "page_views" ("createdAt")`);
    await queryRunner.query(`
      CREATE TABLE "subscribers" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" varchar(254) NOT NULL,
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "unsubscribedAt" datetime,
        CONSTRAINT "UQ_subscribers_email" UNIQUE ("email")
      )`);
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nickname" varchar(20) NOT NULL,
        "content" text NOT NULL,
        "rating" integer NOT NULL,
        "status" varchar(10) NOT NULL DEFAULT ('pending'),
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_reviews_status" ON "reviews" ("status")`);
    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" varchar(254) NOT NULL,
        "passwordHash" varchar(100) NOT NULL,
        "mustChangePassword" boolean NOT NULL DEFAULT (1),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_admin_users_email" UNIQUE ("email")
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_users"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TABLE "subscribers"`);
    await queryRunner.query(`DROP TABLE "page_views"`);
    await queryRunner.query(`DROP TABLE "download_events"`);
    await queryRunner.query(`DROP TABLE "inquiries"`);
  }
}
