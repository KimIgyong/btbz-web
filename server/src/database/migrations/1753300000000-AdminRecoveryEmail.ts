import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRecoveryEmail1753300000000 implements MigrationInterface {
  name = 'AdminRecoveryEmail1753300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_users" ADD COLUMN "recoveryEmail" varchar(254) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "recoveryEmail"`);
  }
}
