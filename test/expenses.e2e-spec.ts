import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Expenses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const mockUser = {
    id: 'user_test_expenses',
  };

  beforeAll(async () => {
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
    // Safety check: Never delete data if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
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
          expect(res.body).toHaveProperty('name', 'Specific Expense');
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
});
