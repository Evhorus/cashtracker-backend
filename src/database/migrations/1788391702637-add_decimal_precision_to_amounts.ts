import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `envelope.amount`, `envelope.spent` and `expense.amount` were declared as
 * plain `numeric` (no precision/scale), so Postgres stores each value with
 * whatever scale it was written with - `35900` stays scale 0, `35900.00`
 * stays scale 2. Same money, different text representation depending on
 * who wrote it (a bulk SQL insert vs. the app's own create flow), which
 * reads as an inconsistency even though no value is actually wrong.
 *
 * Pinning these to numeric(12,2) makes Postgres normalize every value to
 * exactly 2 decimal places on write, regardless of the writer. Existing
 * rows are cast in place - this pads/reformats, it never rounds, since no
 * existing value has more than 2 decimal places already.
 */
export class AddDecimalPrecisionToAmounts1788391702637
  implements MigrationInterface
{
  name = 'AddDecimalPrecisionToAmounts1788391702637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "envelope" ALTER COLUMN "amount" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "envelope" ALTER COLUMN "spent" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ALTER COLUMN "amount" TYPE numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" ALTER COLUMN "amount" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "envelope" ALTER COLUMN "spent" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "envelope" ALTER COLUMN "amount" TYPE numeric`,
    );
  }
}
