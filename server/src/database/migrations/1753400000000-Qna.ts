import { MigrationInterface, QueryRunner } from 'typeorm';

export class Qna1753400000000 implements MigrationInterface {
  name = 'Qna1753400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "qna_posts" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nickname" varchar(40) NOT NULL,
        "email" varchar(254) NOT NULL,
        "title" varchar(200) NOT NULL,
        "contentHtml" text NOT NULL,
        "rating" integer NOT NULL DEFAULT (0),
        "status" varchar(10) NOT NULL DEFAULT ('visible'),
        "ip" varchar(64) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_qna_posts_status" ON "qna_posts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_qna_posts_createdAt" ON "qna_posts" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE "qna_attachments" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "postId" integer NOT NULL,
        "kind" varchar(10) NOT NULL,
        "originalName" varchar(255) NOT NULL,
        "storedName" varchar(100) NOT NULL,
        "mimeType" varchar(100) NOT NULL,
        "size" integer NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_qna_attachments_post" FOREIGN KEY ("postId")
          REFERENCES "qna_posts" ("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_qna_attachments_postId" ON "qna_attachments" ("postId")`);

    await queryRunner.query(`
      CREATE TABLE "qna_replies" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "postId" integer NOT NULL,
        "body" text NOT NULL,
        "author" varchar(40) NOT NULL DEFAULT ('BTBZ'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_qna_replies_post" FOREIGN KEY ("postId")
          REFERENCES "qna_posts" ("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_qna_replies_postId" ON "qna_replies" ("postId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "qna_replies"`);
    await queryRunner.query(`DROP TABLE "qna_attachments"`);
    await queryRunner.query(`DROP TABLE "qna_posts"`);
  }
}
