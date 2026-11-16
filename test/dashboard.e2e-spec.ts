import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { assertSafeTestDatabase } from './assert-safe-test-database';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';

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
    // Personal categories too: they outlived the run, so a test that
    // renames one collided (409) with the previous run's leftover.
    // Global ones (userId NULL) are seeded data and stay.
    await dataSource.query('DELETE FROM category WHERE "userId" IS NOT NULL');
    // Personal categories only - the global set (userId IS NULL) is
    // seeded data every user shares.
    await dataSource.query('DELETE FROM category WHERE "userId" IS NOT NULL');
  });

  interface BreakdownRow {
    category: { id: string; label: string; color: string; icon: string } | null;
    spent: number;
    expenseCount: number;
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

  it('reports the date span of each envelope in the envelope breakdown', async () => {
    await seed('tarjetas', undefined, 100);
    const list = await request(app.getHttpServer())
      .get('/envelopes')
      .expect(200);
    const id = (list.body as { data: { id: string }[] }).data[0].id;
    await request(app.getHttpServer())
      .post(`/envelopes/${id}/expenses`)
      .send({ name: 'otro', amount: 50, currency: 'COP', date: '2026-09-02' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/dashboard/envelope-breakdown')
      .query({ currency: 'COP' })
      .expect(200);

    expect(res.body).toEqual([
      expect.objectContaining({
        envelopeName: 'tarjetas',
        firstExpenseDate: '2026-08-20',
        lastExpenseDate: '2026-09-02',
      }),
    ]);
  });

  it('groups spend by category, biggest first', async () => {
    const hogar = await createCategory('Hogar');
    const transporte = await createCategory('Transporte');
    await seed('a', hogar, 300);
    await seed('b', hogar, 200);
    await seed('c', transporte, 400);

    const rows = await breakdown({ currency: 'COP' });

    // Two envelopes (one expense each) summed into one row, and 500 > 400
    // puts it first.
    expect(
      rows.map((r) => [r.category?.label, r.spent, r.expenseCount]),
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
      expenseCount: 1,
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
    expect(rows[0].expenseCount).toBe(2);
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

  it('rejects a date range that ends before it starts', async () => {
    // It used to be accepted and silently matched nothing.
    await request(app.getHttpServer())
      .get('/dashboard/category-breakdown')
      .query({
        currency: 'COP',
        startDate: '2026-08-31',
        endDate: '2026-08-01',
      })
      .expect(400);
  });

  it('rejects a timestamp where a calendar date is expected', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/category-breakdown')
      .query({ currency: 'COP', startDate: '2026-08-01T00:00:00Z' })
      .expect(400);
  });

  it('narrows to a calendar year', async () => {
    const hogar = await createCategory('Hogar');
    await seed('a', hogar, 100);

    expect(await breakdown({ currency: 'COP', year: '2026' })).toHaveLength(1);
    expect(await breakdown({ currency: 'COP', year: '2020' })).toEqual([]);
  });
});

/**
 * The by-name breakdown is also a GROUP BY, and `normalizeString` (run on
 * every expense name at save time) only trims/collapses whitespace - it
 * never touches casing. A bulk import (a bank statement, a PDF receipt
 * log) or just inconsistent typing can easily save "Mercaldas" one time
 * and "MERCALDAS" the next; only a real database proves the query still
 * folds those into a single row instead of double-counting the merchant.
 */
describe('Dashboard name breakdown (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const mockUser = { id: 'user_test123' };

  beforeAll(async () => {
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
    // Personal categories too: they outlived the run, so a test that
    // renames one collided (409) with the previous run's leftover.
    // Global ones (userId NULL) are seeded data and stay.
    await dataSource.query('DELETE FROM category WHERE "userId" IS NOT NULL');
  });

  interface NameBreakdownRow {
    name: string;
    spent: number;
    expenseCount: number;
  }

  async function nameBreakdown(query: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .get('/dashboard/name-breakdown')
      .query(query)
      .expect(200);
    return res.body as NameBreakdownRow[];
  }

  it('folds names that differ only by case into one row, showing the latest spelling', async () => {
    await request(app.getHttpServer())
      .post('/envelopes')
      .send({ name: 'Supermercado', amount: 1_000_000, currency: 'COP' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/envelopes')
      .query({ limit: 100 })
      .expect(200);
    const envelope = (
      list.body as { data: { id: string; name: string }[] }
    ).data.find((e) => e.name === 'Supermercado');
    if (!envelope) throw new Error('seed envelope not created');

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/expenses`)
      .send({
        name: 'Mercaldas',
        amount: 100_000,
        currency: 'COP',
        date: '2026-08-01',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/expenses`)
      .send({
        name: 'MERCALDAS',
        amount: 50_000,
        currency: 'COP',
        date: '2026-08-10',
      })
      .expect(201);

    const rows = await nameBreakdown({ currency: 'COP' });

    expect(rows).toHaveLength(1);
    // "MERCALDAS" is the more recent of the two (10 Aug).
    expect(rows[0]).toEqual({
      name: 'MERCALDAS',
      spent: 150_000,
      expenseCount: 2,
    });
  });
});

/**
 * The summary has to read the same whichever way someone organises
 * envelopes - the app has both styles in use:
 *
 * - one envelope per month ("Octubre - Davi Scoti"), created in the month
 *   its expenses fall in;
 * - one long-lived envelope per purpose ("Aseo", "Arriendo") that collects
 *   every month's expenses.
 *
 * Anything "over time" (the monthly chart, the year filter, the years on
 * offer) therefore follows each expense's own date. It used to follow the
 * envelope's creation date, which put a whole year of a long-lived
 * envelope into the month it was created. The envelope totals (assigned,
 * spent, available, exceeded) are the envelopes' current state and are
 * not date-filtered at all.
 */
describe('Dashboard summary (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const mockUser = { id: 'user_test_summary' };

  beforeAll(async () => {
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
    // Personal categories too: they outlived the run, so a test that
    // renames one collided (409) with the previous run's leftover.
    // Global ones (userId NULL) are seeded data and stay.
    await dataSource.query('DELETE FROM category WHERE "userId" IS NOT NULL');
  });

  interface Summary {
    totalEnvelopes: number;
    totals: {
      currency: string;
      totalAssigned: number;
      totalSpent: number;
      totalAvailable: number;
      totalExceeded: number;
    }[];
    chart: { month: string; spent: number }[];
    chartCurrency: string | null;
    availableYears: number[];
  }

  /** Creates an envelope and backdates it, since created_at is set by
   * the database and cannot be sent through the API. */
  async function createEnvelope(
    name: string,
    amount: number | null,
    createdAt: string,
  ) {
    await request(app.getHttpServer())
      .post('/envelopes')
      .send({ name, amount, currency: 'COP' })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM envelope WHERE "userId" = $1 ORDER BY created_at DESC LIMIT 1',
      [mockUser.id],
    );
    await dataSource.query(
      'UPDATE envelope SET created_at = $2 WHERE id = $1',
      [id, createdAt],
    );
    return id as string;
  }

  async function addExpense(envelopeId: string, amount: number, date: string) {
    await request(app.getHttpServer())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send({ name: 'Item', amount, currency: 'COP', date })
      .expect(201);
  }

  async function summary(query: Record<string, string> = {}) {
    const res = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .query(query)
      .expect(200);
    return res.body as Summary;
  }

  it('charts a long-lived envelope by the month each expense happened', async () => {
    const aseo = await createEnvelope('Aseo', 1_000_000, '2026-01-10');
    await addExpense(aseo, 100, '2026-01-15');
    await addExpense(aseo, 200, '2026-03-02');
    await addExpense(aseo, 300, '2026-03-20');
    await addExpense(aseo, 400, '2026-06-01');

    const { chart } = await summary();

    expect(chart).toEqual([
      { month: '2026-01', spent: 100 },
      { month: '2026-03', spent: 500 },
      { month: '2026-06', spent: 400 },
    ]);
  });

  it('charts one-envelope-per-month the same way it always read', async () => {
    const sept = await createEnvelope('Septiembre', 500_000, '2026-09-01');
    const oct = await createEnvelope('Octubre', 500_000, '2026-10-01');
    await addExpense(sept, 120_000, '2026-09-12');
    await addExpense(oct, 80_000, '2026-10-03');
    await addExpense(oct, 70_000, '2026-10-25');

    const { chart } = await summary();

    expect(chart).toEqual([
      { month: '2026-09', spent: 120_000 },
      { month: '2026-10', spent: 150_000 },
    ]);
  });

  it('filters the chart and the years on offer by expense date', async () => {
    const aseo = await createEnvelope('Aseo', null, '2025-11-01');
    await addExpense(aseo, 100, '2025-12-20');
    await addExpense(aseo, 200, '2026-02-01');

    const all = await summary();
    expect(all.availableYears).toEqual([2026, 2025]);

    const in2026 = await summary({ year: '2026' });
    expect(in2026.chart).toEqual([{ month: '2026-02', spent: 200 }]);
    // Envelope state is not date-filtered: the envelope still exists and
    // still holds both expenses.
    expect(in2026.totalEnvelopes).toBe(1);
    expect(in2026.totals[0].totalSpent).toBe(300);
  });

  it('reports what is left and what was overspent separately', async () => {
    // 100 left in one envelope, 50 over in another. Netting them (the
    // old "available" did) showed 50 and hid both facts.
    const room = await createEnvelope('Con saldo', 300, '2026-10-01');
    const over = await createEnvelope('Pasado', 200, '2026-10-01');
    const unlimited = await createEnvelope('Sin límite', null, '2026-10-01');
    await addExpense(room, 200, '2026-10-05');
    await addExpense(over, 250, '2026-10-06');
    await addExpense(unlimited, 999, '2026-10-07');

    const [cop] = (await summary()).totals;

    expect(cop).toMatchObject({
      currency: 'COP',
      totalAssigned: 500,
      totalSpent: 1449,
      totalAvailable: 100,
      totalExceeded: 50,
    });
  });
});
