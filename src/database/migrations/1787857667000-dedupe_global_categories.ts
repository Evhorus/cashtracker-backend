import { MigrationInterface, QueryRunner } from 'typeorm';

// Fixes a race condition from the previous migration
// (MakeCategoryUseridNullable1787857404000): two near-simultaneous CLI
// connections both saw it as pending and ran it before either committed,
// so the 9 global categories got inserted twice and the migration itself
// got recorded twice in the `migrations` table.
//
// The actual data on the shared dev/prod database was already fixed by
// hand (same statements as below, run directly - see PR description /
// conversation history) before this file was added, so this migration's
// `up()` is written to be a no-op there and a real fix anywhere else this
// schema gets applied fresh (a CI database, another environment) where
// the duplication never happened:
//   1. Collapses each duplicate pair of global rows (userId IS NULL) down
//      to one per label - harmless if there are no duplicates.
//   2. Removes any duplicate `migrations` bookkeeping rows - harmless if
//      there are none.
//   3. Adds a partial unique index on label for global rows, so this
//      exact failure mode can't silently duplicate data again - guarded
//      with IF NOT EXISTS since it may already exist on databases where
//      the fix was applied by hand first.
export class DedupeGlobalCategories1787857667000 implements MigrationInterface {
  name = 'DedupeGlobalCategories1787857667000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "category" a USING "category" b
      WHERE a.ctid < b.ctid
        AND a."userId" IS NULL
        AND b."userId" IS NULL
        AND a.label = b.label
    `);

    await queryRunner.query(`
      DELETE FROM "migrations" a USING "migrations" b
      WHERE a.id < b.id AND a.name = b.name
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_category_global_label" ON "category" (label)
      WHERE "userId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_category_global_label"`,
    );
    // The dedupe itself (data cleanup) is intentionally not reversed -
    // there's nothing meaningful to restore, the removed rows were exact
    // duplicates.
  }
}
