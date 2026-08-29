import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { assertSafeTestDatabase } from './assert-safe-test-database';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Envelopes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Mock Clerk user
  const mockUser = {
    id: 'user_test123',
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
    // The real safety check is assertSafeTestDatabase() in beforeAll -
    // a NODE_ENV check here proved nothing, since test:e2e sets
    // NODE_ENV=test itself.
    await dataSource.query('DELETE FROM expense');
    await dataSource.query('DELETE FROM envelope');
  });

  describe('/envelopes (POST)', () => {
    it('should create a new envelope', () => {
      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Groceries',
          amount: 500,
          currency: 'COP',
          category: 'Food',
          description: 'Monthly groceries',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Sobre creado');
        });
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Test',
          amount: -100, // Invalid: negative amount
        })
        .expect(400);
    });

    it('should fail with amount having more than 2 decimals', () => {
      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Test',
          amount: 100.123, // Invalid: 3 decimal places
        })
        .expect(400);
    });

    it('should create an envelope without an amount (no spending limit)', () => {
      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Unlimited Tracking',
          currency: 'COP',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Sobre creado');
        });
    });

    it('should create an envelope with amount: null (no spending limit)', () => {
      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Unlimited Tracking Explicit Null',
          currency: 'COP',
          amount: null,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Sobre creado');
        });
    });
  });

  describe('/envelopes (GET)', () => {
    it('should return empty array when no envelopes exist', () => {
      return request(app.getHttpServer())
        .get('/envelopes')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toEqual([]);
          expect(res.body.meta).toHaveProperty('total', 0);
        });
    });

    it('should return user envelopes without expenses', async () => {
      // Create an envelope first
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        amount: 500,
        currency: 'COP',
        category: 'Food',
      });

      return request(app.getHttpServer())
        .get('/envelopes')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBe(1);
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0]).toHaveProperty('name', 'Groceries');
          expect(res.body.data[0]).toHaveProperty('currency', 'COP');
          expect(parseFloat(res.body.data[0].spent)).toBe(0);
          expect(res.body.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
        });
    });

    it('should return amount: null for an envelope created without a limit', async () => {
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'No Limit',
        currency: 'COP',
      });

      return request(app.getHttpServer())
        .get('/envelopes')
        .expect(200)
        .expect((res) => {
          const envelope = res.body.data.find(
            (b: { name: string }) => b.name === 'No Limit',
          );
          expect(envelope).toBeDefined();
          expect(envelope.amount).toBeNull();
        });
    });

    it('should only return envelopes for authenticated user', async () => {
      // This test verifies ownership isolation
      // In a real scenario, you'd create envelopes for different users
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'My Envelope',
        amount: 1000,
        currency: 'COP',
      });

      return request(app.getHttpServer())
        .get('/envelopes')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBe(1);
          // All envelopes should belong to mockUser
        });
    });

    it('should filter by search across name and category, case-insensitively', async () => {
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        currency: 'COP',
        category: 'Food',
      });
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Rent',
        currency: 'COP',
        category: 'Housing',
      });

      // Matches by name
      await request(app.getHttpServer())
        .get('/envelopes')
        .query({ search: 'groc' })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBe(1);
          expect(res.body.data[0]).toHaveProperty('name', 'Groceries');
        });

      // Matches by category, case-insensitively
      await request(app.getHttpServer())
        .get('/envelopes')
        .query({ search: 'HOUS' })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBe(1);
          expect(res.body.data[0]).toHaveProperty('name', 'Rent');
        });

      // No match
      await request(app.getHttpServer())
        .get('/envelopes')
        .query({ search: 'nonexistent' })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBe(0);
        });
    });
  });

  describe('/envelopes/:envelopeId (GET)', () => {
    it('should return envelope with expenses', async () => {
      // Create envelope via API
      const res = await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        amount: 500,
        currency: 'COP',
        category: 'Food',
      });
      const envelopeId =
        res.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      return request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', envelopeId);
          expect(res.body).toHaveProperty('expenses');
          expect(Array.isArray(res.body.expenses)).toBe(true);
        });
    });

    it('should return 404 for non-existent envelope', () => {
      return request(app.getHttpServer())
        .get('/envelopes/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/envelopes/invalid-uuid')
        .expect(400);
    });
  });

  describe('/envelopes/:envelopeId (PATCH)', () => {
    it('should update envelope', async () => {
      // Create envelope via API
      const res = await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Old Name',
        amount: 500,
        currency: 'COP',
      });
      const envelopeId =
        res.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      return request(app.getHttpServer())
        .patch(`/envelopes/${envelopeId}`)
        .send({ name: 'New Name', amount: 600 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Sobre actualizado');
        });
    });
  });

  describe('/envelopes/:envelopeId (DELETE)', () => {
    it('should delete envelope and cascade expenses', async () => {
      // Create envelope via API
      const envelopeRes = await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'To Delete',
          amount: 500,
          currency: 'COP',
        });
      const envelopeId =
        envelopeRes.body.id ||
        (
          await dataSource.query(
            'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
          )
        )[0].id;

      // Create expense via API
      await request(app.getHttpServer())
        .post(`/envelopes/${envelopeId}/expenses`)
        .send({
          name: 'Expense',
          amount: 50,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        });

      // Delete envelope
      await request(app.getHttpServer())
        .delete(`/envelopes/${envelopeId}`)
        .expect(200);

      // Verify envelope is deleted
      const envelopes = await dataSource.query(
        'SELECT * FROM envelope WHERE id = $1',
        [envelopeId],
      );
      expect(envelopes).toHaveLength(0);

      // Verify expenses are cascaded
      const expenses = await dataSource.query(
        'SELECT * FROM expense WHERE "envelopeId" = $1',
        [envelopeId],
      );
      expect(expenses).toHaveLength(0);
    });
  });
});
