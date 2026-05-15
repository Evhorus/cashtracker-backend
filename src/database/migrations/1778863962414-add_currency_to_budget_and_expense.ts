import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToBudgetAndExpense1778863962414 implements MigrationInterface {
  name = 'AddCurrencyToBudgetAndExpense1778863962414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget" ADD "currency" character varying NOT NULL DEFAULT 'COP'`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD "currency" character varying NOT NULL DEFAULT 'COP'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expense" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "budget" DROP COLUMN "currency"`);
  }
}
