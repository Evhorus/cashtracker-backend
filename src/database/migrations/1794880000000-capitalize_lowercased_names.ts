import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Envelope and expense names used to be lowercased on save, and the web
 * client capitalised their first letter for display. Names are now
 * stored and shown exactly as typed, so the rows saved under the old
 * rule get the one change the client used to make on screen: first
 * letter upper-cased, and only where the whole name is lowercase (a
 * name with any capital of its own was typed that way and is left
 * alone). What every user sees does not change.
 *
 * Not reversible: lowercasing back would also flatten names typed with
 * capitals after this runs, so `down` does nothing.
 */
export class CapitalizeLowercasedNames1794880000000 implements MigrationInterface {
  name = 'CapitalizeLowercasedNames1794880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['envelope', 'expense']) {
      await queryRunner.query(
        `UPDATE "${table}"
            SET "name" = upper(left("name", 1)) || substr("name", 2)
          WHERE "name" = lower("name")
            AND "name" <> upper("name")`,
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty - see the class comment.
  }
}
