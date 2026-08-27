import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoryTable1787855803000 implements MigrationInterface {
  name = 'CreateCategoryTable1787855803000';

  // Standalone table - no FK to "envelope". envelope.category stays free
  // text exactly as it is today; this migration only ever adds a new
  // table, it never touches existing rows.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "label" character varying NOT NULL, "color" character varying NOT NULL, "icon" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_category_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_category_userId" ON "category" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_category_userId_label" ON "category" ("userId", "label")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_category_userId_label"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_category_userId"`);
    await queryRunner.query(`DROP TABLE "category"`);
  }
}
