import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { assertSafeTestDatabase } from './assert-safe-test-database';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The category breakdown is a GROUP BY, so only a real database proves
 * it: that the grouping key behaves as expected on free-text (including
 * NULL, which SQL groups separately from any string), that SUM over a
 * `decimal` column adds up, and that the currency and year filters
 * actually narrow it.
 */
describe('Dashboard category breakdown (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const mockUser = { id: 'user_test123' };

  beforeAll(async () => {
    // Before any connection is opened - this suite wipes tables.
    assertSafeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClerkAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM expense');
    await dataSource.query('DELETE FROM envelope');
    // Personal categories only - the global set (userId IS NULL) is
    // seeded data every user shares.
    await dataSource.query('DELETE FROM category WHERE "userId" IS NOT NULL');
  });

  interface BreakdownRow {
    category: { id: string; label: string; color: string; icon: string } | null;
    spent: number;
    envelopeCount: number;
  }

  /** Creates a category and returns its id - envelopes reference
   * categories by id now. */
  async function createCategory(label: string): Promise<string> {
    // Reuse an existing visible category when there is one. Several of
    // these labels ("Hogar", "Transporte") are among the nine global
    // categories every user already sees, and a guard rejects creating a
    // personal category that shadows a global label - so blindly POSTing
    // returns 409.
    const existing = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    const found = (existing.body as { id: string; label: string }[]).find(
      (c) => c.label.toLowerCase() === label.toLowerCase(),
    );
    if (found) return found.id;

    await request(app.getHttpServer())
      .post('/categories')
      .send({ label, color: 'oklch(0.72 0.14 153)', icon: 'tag' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    const category = (res.body as { id: string; label: string }[]).find(
      (c) => c.label === label,
    );
    if (!category) throw new Error(`category ${label} not created`);
    return category.id;
  }

  /** Creates an envelope and spends against it through the real endpoint,
   * so `spent` is maintained by the service rather than written directly. */
  async function seed(
    name: string,
    categoryId: string | undefined,
    spent: number,
    currency = 'COP',
  ) {
    await request(app.getHttpServer())
      .post('/envelopes')
      .send({ name, amount: 1_000_000, currency, categoryId })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/envelopes')
      .query({ limit: 100 })
      .expect(200);

    const envelope = (
      list.body as { data: { id: string; name: string }[] }
    ).data.find((e) => e.name === name);
    if (!envelope) throw new Error(`seed failed for ${name}`);

    if (spent > 0) {
      await request(app.getHttpServer())
        .post(`/envelopes/${envelope.id}/expenses`)
        .send({
          name: `${name} gasto`,
          amount: spent,
          currency,
          date: '2026-08-20',
        })
        .expect(201);
    }
  }

  async function breakdown(query: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .get('/dashboard/category-breakdown')
      .query(query)
      .expect(200);
    return res.body as BreakdownRow[];
  }

  it('groups spend by category, biggest first', async () => {
    const hogar = await createCategory('Hogar');
    const transporte = await createCategory('Transporte');
    await seed('a', hogar, 300);
    await seed('b', hogar, 200);
    await seed('c', transporte, 400);

    const rows = await breakdown({ currency: 'COP' });

    // Two envelopes summed into one row, and 500 > 400 puts it first.
    expect(
      rows.map((r) => [r.category?.label, r.spent, r.envelopeCount]),
    ).toEqual([
      ['Hogar', 500, 2],
      ['Transporte', 400, 1],
    ]);
  });

  it('carries the label, colour and icon so the chip needs no lookup', async () => {
    // A label that isn't one of the nine global categories, so this test
    // owns the colour and icon it asserts on.
    const id = await createCategory('Suscripciones QA');
    await seed('a', id, 100);

    const [row] = await breakdown({ currency: 'COP' });

    expect(row.category).toEqual({
      id,
      label: 'Suscripciones QA',
      color: 'oklch(0.72 0.14 153)',
      icon: 'tag',
    });
  });

  it('reports envelopes with no category as their own null row', async () => {
    const hogar = await createCategory('Hogar');
    await seed('sin', undefined, 150);
    await seed('con', hogar, 100);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows).toContainEqual({
      category: null,
      spent: 150,
      envelopeCount: 1,
    });
  });

  it('is one row per category, whatever the envelopes are called', async () => {
    // When `category` was free text this grouped by the string, so
    // "Hogar" and "hogar" were two rows and the client had to re-merge
    // them. With a foreign key one category is one row by construction.
    const hogar = await createCategory('Hogar');
    await seed('a', hogar, 100);
    await seed('b', hogar, 100);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows).toHaveLength(1);
    expect(rows[0].envelopeCount).toBe(2);
  });

  it('excludes envelopes with nothing spent', async () => {
    const hogar = await createCategory('Hogar');
    const viajes = await createCategory('Viajes');
    await seed('gastado', hogar, 100);
    await seed('intacto', viajes, 0);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows.map((r) => r.category?.label)).toEqual(['Hogar']);
  });

  it('scopes to the requested currency', async () => {
    const hogar = await createCategory('Hogar');
    await seed('cop', hogar, 100, 'COP');
    await seed('usd', hogar, 50, 'USD');

    expect((await breakdown({ currency: 'COP' })).map((r) => r.spent)).toEqual([
      100,
    ]);
    expect((await breakdown({ currency: 'USD' })).map((r) => r.spent)).toEqual([
      50,
    ]);
  });

  it('sums decimal amounts exactly', async () => {
    // `spent` is a decimal column; 0.1 + 0.2 in float would not be 0.3.
    const hogar = await createCategory('Hogar');
    await seed('a', hogar, 0.1);
    await seed('b', hogar, 0.2);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows[0].spent).toBe(0.3);
  });

  it('returns an empty array when nothing has been spent', async () => {
    expect(await breakdown({ currency: 'COP' })).toEqual([]);
  });

  it('requires a currency rather than guessing one', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/category-breakdown')
      .expect(400);
  });

  it('rejects an unknown currency', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/category-breakdown')
      .query({ currency: 'XXX' })
      .expect(400);
  });

  it('narrows to a calendar year', async () => {
    const hogar = await createCategory('Hogar');
    await seed('a', hogar, 100);

    expect(await breakdown({ currency: 'COP', year: '2026' })).toHaveLength(1);
    expect(await breakdown({ currency: 'COP', year: '2020' })).toEqual([]);
  });
});
