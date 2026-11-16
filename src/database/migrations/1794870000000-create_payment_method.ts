import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only: a new table and a nullable column on expense. No
 * existing row changes - every current expense simply has no payment
 * method until its owner sets one.
 */
export class CreatePaymentMethod1794870000000 implements MigrationInterface {
  name = 'CreatePaymentMethod1794870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_method" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying(50) NOT NULL, "type" character varying(20) NOT NULL, "color" character varying NOT NULL, "cutDay" smallint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_payment_method_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_payment_method_cutDay" CHECK ("cutDay" IS NULL OR ("cutDay" BETWEEN 1 AND 31)))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_method_userId" ON "payment_method" ("userId")`,
    );
    // Case-insensitive: "Davivienda" and "davivienda" are one card.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_method_userId_name" ON "payment_method" ("userId", LOWER("name"))`,
    );
    await queryRunner.query(`ALTER TABLE "expense" ADD "paymentMethodId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_expense_paymentMethodId" ON "expense" ("paymentMethodId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD CONSTRAINT "FK_expense_paymentMethodId" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_method"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" DROP CONSTRAINT "FK_expense_paymentMethodId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_expense_paymentMethodId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" DROP COLUMN "paymentMethodId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_method_userId_name"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_method_userId"`);
    await queryRunner.query(`DROP TABLE "payment_method"`);
  }
}
