import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeBudgetAmountNullable1787416141438 implements MigrationInterface {
  name = 'MakeBudgetAmountNullable1787416141438';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget" ALTER COLUMN "amount" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget" ALTER COLUMN "amount" SET NOT NULL`,
    );
  }
}
