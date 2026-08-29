import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces `envelope.category` (free text) with `envelope.categoryId`, a
 * real foreign key to `category`.
 *
 * The text column was not just untidy - it made renaming a category
 * silently detach every envelope using it. `CategoriesService.update`
 * changed the category row and nothing else, so the envelopes kept the
 * old string, stopped resolving to any category (losing its icon and
 * colour), and the renamed category's own envelope count dropped to
 * zero. Deleting behaved the same way. A foreign key makes both correct
 * by construction: a rename touches one row, and a delete is handled by
 * ON DELETE SET NULL.
 *
 * It also lets spending be grouped by category in SQL. Until now
 * `GET /dashboard/category-breakdown` had to group by the raw string and
 * let the client re-merge, because two spellings of one category are two
 * groups to the database.
 *
 * ORPHANED TEXT
 * Any envelope whose text matches no category visible to its owner gets
 * a personal category created for it, rather than being set to NULL.
 * Those labels were chosen by a user; discarding them loses information,
 * and an unwanted category is two clicks to delete. On the database this
 * was written against there were exactly two ("Educación", "Mileto") out
 * of 17 envelopes carrying text - the other 15 mapped cleanly, with no
 * spelling variants. New categories get the neutral 'tag' icon and the
 * last preset colour, the same fallback the UI already showed for
 * unrecognized text.
 */
export class EnvelopeCategoryFk1787950000000 implements MigrationInterface {
  name = 'EnvelopeCategoryFk1787950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "envelope" ADD COLUMN IF NOT EXISTS "categoryId" uuid`,
    );

    // Give orphaned text a real category, owned by whoever had it.
    // DISTINCT so one label used by several of a user's envelopes
    // produces one category. Global categories (userId IS NULL) are
    // visible to everyone, so a label matching one of those is not an
    // orphan.
    await queryRunner.query(`
      INSERT INTO "category" ("userId", "label", "color", "icon", "isDefault")
      SELECT DISTINCT e."userId", btrim(e."category"), 'oklch(0.6 0.02 260)', 'tag', false
      FROM "envelope" e
      WHERE e."category" IS NOT NULL
        AND btrim(e."category") <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "category" c
          WHERE lower(c."label") = lower(btrim(e."category"))
            AND (c."userId" = e."userId" OR c."userId" IS NULL)
        )
    `);

    // Backfill. Matching is case- and whitespace-insensitive, exactly
    // how resolveCategory did it on the client.
    //
    // DISTINCT ON (e2.id) - one category per envelope, not one envelope
    // per label. Ordering by c."userId" NULLS LAST prefers a user's own
    // category over a global one of the same name. A guard already stops
    // a user from shadowing a global label, so this should never have to
    // choose - but if it ever did, silently taking whichever row the
    // planner returned first would be worse than choosing deliberately.
    await queryRunner.query(`
      UPDATE "envelope" e
      SET "categoryId" = match.id
      FROM (
        SELECT DISTINCT ON (e2.id) e2.id AS envelope_id, c.id
        FROM "envelope" e2
        JOIN "category" c
          ON lower(c."label") = lower(btrim(e2."category"))
         AND (c."userId" = e2."userId" OR c."userId" IS NULL)
        WHERE e2."category" IS NOT NULL AND btrim(e2."category") <> ''
        ORDER BY e2.id, c."userId" NULLS LAST
      ) AS match
      WHERE e.id = match.envelope_id
    `);

    await queryRunner.query(`
      ALTER TABLE "envelope"
      ADD CONSTRAINT "FK_envelope_category"
      FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL
    `);

    // Envelopes are listed and grouped by category constantly.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_envelope_categoryId" ON "envelope" ("categoryId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "envelope" DROP COLUMN IF EXISTS "category"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "envelope" ADD COLUMN IF NOT EXISTS "category" text`,
    );

    // Restores the label as text. Envelopes whose category had been
    // deleted in the meantime come back as NULL rather than as a
    // dangling name.
    await queryRunner.query(`
      UPDATE "envelope" e
      SET "category" = c."label"
      FROM "category" c
      WHERE c.id = e."categoryId"
    `);

    await queryRunner.query(
      `ALTER TABLE "envelope" DROP CONSTRAINT IF EXISTS "FK_envelope_category"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_envelope_categoryId"`);
    await queryRunner.query(
      `ALTER TABLE "envelope" DROP COLUMN IF EXISTS "categoryId"`,
    );

    // Categories invented for orphaned text in up() are deliberately
    // left behind: by the time this runs they may have been renamed,
    // recoloured or attached to newer envelopes, and deleting them would
    // destroy work rather than undo a migration.
  }
}
