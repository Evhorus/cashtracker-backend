import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { assertSafeTestDatabase } from './assert-safe-test-database';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';

describe('Expenses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const mockUser = {
    id: 'user_test_expenses',
  };

  beforeAll(async () => {
    // Before any connection is opened - these suites wipe tables.
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
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  afterEach(async () => {
    // The real safety check is assertSafeTestDatabase() in beforeAll -
    // a NODE_ENV check here proved nothing, since test:e2e sets
    // NODE_ENV=test itself.
    await dataSource.query('DELETE FROM expense');
    await dataSource.query('DELETE FROM envelope');
  });

  describe('/envelopes/:envelopeId/expenses (POST)', () => {
    it('should create an expense and update envelope spent amount', async () => {
      // 1. Create an envelope via API
      const envelopeRes = await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Test Envelope',
          amount: 1000,
          currency: 'COP',
        });
      const envelopeId =
        envelopeRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      // 2. Add an expense
      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Coffee',
          amount: 5,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      // 3. Verify envelope spent amount was updated
      const envelope = await dataSource.query(
        'SELECT spent FROM envelope WHERE id = $1',
        [envelopeId],
      );
      expect(parseFloat(envelope[0].spent)).toBe(5);
    });

    it('should fail if envelope belongs to another user', async () => {
      // Create an envelope for another user via SQL (since we can't easily mock other users via API with current setup)
      await dataSource.query(
        `INSERT INTO envelope (name, amount, spent, "userId", currency)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Other Envelope', 1000, 0, 'other_user_id', 'COP'],
      );
      const envelopeId = (
        await dataSource.query('SELECT id FROM envelope WHERE "userId" = $1', [
          'other_user_id',
        ])
      )[0].id;

      // An envelope owned by someone else must look the same as one that
      // doesn't exist at all - see EnvelopeExistsGuard.
      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Steal',
          amount: 100,
          currency: 'COP',
          date: '2024-05-12',
        })
        .expect(404);
    });
  });

  describe('/envelopes/:envelopeId/expenses (GET)', () => {
    it('should return a single expense', async () => {
      // Create envelope and expense via API
      const envelopeRes = await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Single Expense Envelope',
          amount: 1000,
          currency: 'COP',
        });
      const envelopeId =
        envelopeRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      const expenseRes = await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Specific Expense',
          amount: 50,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        });
      const expenseId =
        expenseRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM expense ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      return request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}/expenses/${expenseId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', expenseId);
          // Name comes back lowercased - normalized on save.
          expect(res.body).toHaveProperty('name', 'specific expense');
        });
    });

    it('should update an expense and reflect in envelope spent', async () => {
      // Create envelope and expense via API
      const envelopeRes = await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Update Expense Envelope',
          amount: 1000,
          currency: 'COP',
        });
      const envelopeId =
        envelopeRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      const expenseRes = await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Changeable Expense',
          amount: 100,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        });
      const expenseId =
        expenseRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM expense ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      // Update expense amount from 100 to 150 (diff +50)
      await request(app.getHttpServer())
        .patch(`/envelopes/${envelopeId}/expenses/${expenseId}`)
        .send({ amount: 150 })
        .expect(200);

      const envelope = await dataSource.query(
        'SELECT spent FROM envelope WHERE id = $1',
        [envelopeId],
      );
      expect(parseFloat(envelope[0].spent)).toBe(150);
    });

    it('should remove an expense and decrement envelope spent', async () => {
      // Create envelope and expense via API
      const envelopeRes = await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Remove Expense Envelope',
          amount: 1000,
          currency: 'COP',
        });
      const envelopeId =
        envelopeRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      const expenseRes = await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Disposable Expense',
          amount: 200,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        });
      const expenseId =
        expenseRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM expense ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      await request(app.getHttpServer())
        .delete(`/envelopes/${envelopeId}/expenses/${expenseId}`)
        .expect(200);

      const envelope = await dataSource.query(
        'SELECT spent FROM envelope WHERE id = $1',
        [envelopeId],
      );
      expect(parseFloat(envelope[0].spent)).toBe(0);
    });
  });

  describe('money integrity', () => {
    const today = () => new Date().toISOString().split('T')[0];

    async function createEnvelope(currency = 'COP') {
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name: `Integrity ${currency}`, amount: 1000, currency })
        .expect(201);
      const [{ id }] = await dataSource.query(
        'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
      );
      return id as string;
    }

    async function createExpense(envelopeId: string, amount: number) {
      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({ name: 'Item', amount, currency: 'COP', date: today() })
        .expect(201);
      const [{ id }] = await dataSource.query(
        'SELECT id FROM expense ORDER BY created_at DESC LIMIT 1',
      );
      return id as string;
    }

    async function spentOf(envelopeId: string) {
      const [row] = await dataSource.query(
        'SELECT spent FROM envelope WHERE id = $1',
        [envelopeId],
      );
      return parseFloat(row.spent);
    }

    it('rejects an expense in a different currency than its envelope', async () => {
      const envelopeId = await createEnvelope('COP');

      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({ name: 'Dollars', amount: 20, currency: 'USD', date: today() })
        .expect(400);

      expect(await spentOf(envelopeId)).toBe(0);
    });

    it('rejects changing an expense to another currency', async () => {
      const envelopeId = await createEnvelope('COP');
      const expenseId = await createExpense(envelopeId, 100);

      await request(app.getHttpServer())
        .patch(`/envelopes/${envelopeId}/expenses/${expenseId}`)
        .send({ currency: 'USD' })
        .expect(400);

      const [row] = await dataSource.query(
        'SELECT currency FROM expense WHERE id = $1',
        [expenseId],
      );
      expect(row.currency).toBe('COP');
    });

    it('subtracts an expense once when it is deleted twice at the same time', async () => {
      // A double tap or a retry: both requests pass the guard before
      // either commits. Only one may take the amount off `spent`.
      const envelopeId = await createEnvelope();
      await createExpense(envelopeId, 300);
      const expenseId = await createExpense(envelopeId, 200);

      const responses = await Promise.all(
        [1, 2].map(() =>
          request(app.getHttpServer()).delete(
            `/envelopes/${envelopeId}/expenses/${expenseId}`,
          ),
        ),
      );

      expect(responses.map((r) => r.status).sort()).toEqual([200, 404]);
      expect(await spentOf(envelopeId)).toBe(300);
    });

    it('keeps spent equal to the sum when one expense is edited twice at the same time', async () => {
      const envelopeId = await createEnvelope();
      const expenseId = await createExpense(envelopeId, 100);

      await Promise.all(
        [150, 150].map((amount) =>
          request(app.getHttpServer())
            .patch(`/envelopes/${envelopeId}/expenses/${expenseId}`)
            .send({ amount })
            .expect(200),
        ),
      );

      expect(await spentOf(envelopeId)).toBe(150);
    });

    it('repairs a spent that had drifted on the next write', async () => {
      const envelopeId = await createEnvelope();
      await createExpense(envelopeId, 100);
      await dataSource.query('UPDATE envelope SET spent = 999 WHERE id = $1', [
        envelopeId,
      ]);

      await createExpense(envelopeId, 50);

      expect(await spentOf(envelopeId)).toBe(150);
    });
  });

  describe('input validation', () => {
    async function createEnvelope() {
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name: 'Validation', amount: 1000, currency: 'COP' })
        .expect(201);
      const [{ id }] = await dataSource.query(
        'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
      );
      return id as string;
    }

    const expense = (overrides: Record<string, unknown>) => ({
      name: 'Item',
      amount: 100,
      currency: 'COP',
      date: '2026-11-16',
      ...overrides,
    });

    it('answers an amount past the column ceiling with 400, not 500', async () => {
      const envelopeId = await createEnvelope();

      const res = await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send(expense({ amount: 10_000_000_000 }))
        .expect(400);

      expect(JSON.stringify(res.body)).toMatch(/supera el máximo/);
    });

    it('accepts an amount exactly at the ceiling', async () => {
      const envelopeId = await createEnvelope();

      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send(expense({ amount: 9_999_999_999.99 }))
        .expect(201);
    });

    it.each([
      ['a full timestamp', '2026-11-16T23:30:00-05:00'],
      ['an impossible day', '2026-02-30'],
    ])('rejects %s as an expense date', async (_label, date) => {
      const envelopeId = await createEnvelope();

      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send(expense({ date }))
        .expect(400);
    });

    it('rejects a date range that ends before it starts', async () => {
      const envelopeId = await createEnvelope();

      await request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}/expenses`)
        .query({ startDate: '2026-11-16', endDate: '2026-11-01' })
        .expect(400);
    });

    it('accepts a one-day range', async () => {
      const envelopeId = await createEnvelope();

      await request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}/expenses`)
        .query({ startDate: '2026-11-16', endDate: '2026-11-16' })
        .expect(200);
    });

    it('rejects an envelope limit past the ceiling', async () => {
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name: 'Huge', amount: 10_000_000_000, currency: 'COP' })
        .expect(400);
    });
  });
});
