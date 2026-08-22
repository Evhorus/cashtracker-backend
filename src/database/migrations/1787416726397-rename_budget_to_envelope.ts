import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameBudgetToEnvelope1787416726397 implements MigrationInterface {
  name = 'RenameBudgetToEnvelope1787416726397';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget" RENAME TO "envelope"`);
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "budgetId" TO "envelopeId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "envelopeId" TO "budgetId"`,
    );
    await queryRunner.query(`ALTER TABLE "envelope" RENAME TO "budget"`);
  }
}
