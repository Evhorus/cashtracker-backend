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
  });

  interface BreakdownRow {
    category: string | null;
    spent: number;
    envelopeCount: number;
  }

  /** Creates an envelope and spends against it through the real endpoint,
   * so `spent` is maintained by the service rather than written directly. */
  async function seed(
    name: string,
    category: string | undefined,
    spent: number,
    currency = 'COP',
  ) {
    await request(app.getHttpServer())
      .post('/envelopes')
      .send({ name, amount: 1_000_000, currency, category })
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
    await seed('a', 'Hogar', 300);
    await seed('b', 'Hogar', 200);
    await seed('c', 'Transporte', 400);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows).toEqual([
      // Two envelopes summed into one row, and 500 > 400 puts it first.
      { category: 'Hogar', spent: 500, envelopeCount: 2 },
      { category: 'Transporte', spent: 400, envelopeCount: 1 },
    ]);
  });

  it('reports envelopes with no category as their own null row', async () => {
    await seed('sin', undefined, 150);
    await seed('con', 'Hogar', 100);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows).toContainEqual({
      category: null,
      spent: 150,
      envelopeCount: 1,
    });
  });

  it('does not merge different spellings - category is free text', async () => {
    // Documents current behaviour rather than endorsing it: `category`
    // is not a foreign key, so the grouping key is the string itself.
    await seed('a', 'Hogar', 100);
    await seed('b', 'hogar', 100);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows).toHaveLength(2);
  });

  it('excludes envelopes with nothing spent', async () => {
    await seed('gastado', 'Hogar', 100);
    await seed('intacto', 'Viajes', 0);

    const rows = await breakdown({ currency: 'COP' });

    expect(rows.map((r) => r.category)).toEqual(['Hogar']);
  });

  it('scopes to the requested currency', async () => {
    await seed('cop', 'Hogar', 100, 'COP');
    await seed('usd', 'Hogar', 50, 'USD');

    expect(await breakdown({ currency: 'COP' })).toEqual([
      { category: 'Hogar', spent: 100, envelopeCount: 1 },
    ]);
    expect(await breakdown({ currency: 'USD' })).toEqual([
      { category: 'Hogar', spent: 50, envelopeCount: 1 },
    ]);
  });

  it('sums decimal amounts exactly', async () => {
    // `spent` is a decimal column; 0.1 + 0.2 in float would not be 0.3.
    await seed('a', 'Hogar', 0.1);
    await seed('b', 'Hogar', 0.2);

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
    await seed('a', 'Hogar', 100);

    expect(await breakdown({ currency: 'COP', year: '2026' })).toHaveLength(1);
    expect(await breakdown({ currency: 'COP', year: '2020' })).toEqual([]);
  });
});
