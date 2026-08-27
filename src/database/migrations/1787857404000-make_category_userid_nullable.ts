import { MigrationInterface, QueryRunner } from 'typeorm';

// Switches the 9 predefined categories from "seeded per-user on first
// fetch" to a single shared global set (userId NULL, read-only via the
// normal CRUD endpoints - CategoryExistsGuard already 404s any update/
// delete where category.userId !== the caller's id, and NULL never
// equals a real user id). Cleans up the per-user default rows the old
// lazy-seed logic already created (keeps any real custom categories a
// user made - only rows with isDefault = true are removed).
export class MakeCategoryUseridNullable1787857404000 implements MigrationInterface {
  name = 'MakeCategoryUseridNullable1787857404000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "category" ALTER COLUMN "userId" DROP NOT NULL`,
    );

    // Remove the per-user default rows the old design already created -
    // irreversible, but these are exact duplicates of the global set
    // this migration inserts below, never a user's own edit (a user could
    // only have gotten here via the now-removed seed-on-first-fetch path).
    await queryRunner.query(
      `DELETE FROM "category" WHERE "isDefault" = true AND "userId" IS NOT NULL`,
    );

    await queryRunner.query(`
      INSERT INTO "category" ("id", "userId", "label", "color", "icon", "isDefault", "created_at", "updated_at") VALUES
        (uuid_generate_v4(), NULL, 'Hogar', 'oklch(0.72 0.14 153)', 'house', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Transporte', 'oklch(0.7 0.13 211)', 'car', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Ahorros', 'oklch(0.7 0.13 182)', 'piggy-bank', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Trabajo', 'oklch(0.7 0.13 240)', 'briefcase', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Personal', 'oklch(0.7 0.13 269)', 'user', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Mascotas', 'oklch(0.7 0.13 327)', 'paw-print', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Viajes', 'oklch(0.7 0.13 124)', 'plane', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Entretenimiento', 'oklch(0.7 0.13 298)', 'ticket', true, now(), now()),
        (uuid_generate_v4(), NULL, 'Salud', 'oklch(0.7 0.13 95)', 'heart', true, now(), now())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "category" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "category" ALTER COLUMN "userId" SET NOT NULL`,
    );
  }
}
