import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1778786520480 implements MigrationInterface {
  name = 'InitialSchema1778786520480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "budget" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "amount" numeric NOT NULL, "spent" numeric NOT NULL, "userId" character varying NOT NULL, "category" text, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9af87bcfd2de21bd9630dddaa0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ed65c868c97a5fb471d85efb0" ON "budget" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "expense" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "amount" numeric NOT NULL, "date" date NOT NULL, "description" text, "budgetId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_edd925b450e13ea36197c9590fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD CONSTRAINT "FK_a09e4ae0273f63ed09f9eae0a30" FOREIGN KEY ("budgetId") REFERENCES "budget"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" DROP CONSTRAINT "FK_a09e4ae0273f63ed09f9eae0a30"`,
    );
    await queryRunner.query(`DROP TABLE "expense"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ed65c868c97a5fb471d85efb0"`,
    );
    await queryRunner.query(`DROP TABLE "budget"`);
  }
}
