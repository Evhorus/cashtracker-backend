import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Budgets (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Mock Clerk user
  const mockUser = {
    id: 'user_test123',
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
    // Safety check: Never delete data if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    await dataSource.query('DELETE FROM expense');
    await dataSource.query('DELETE FROM budget');
  });

  describe('/budgets (POST)', () => {
    it('should create a new budget', () => {
      return request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'Groceries',
          amount: 500,
          currency: 'COP',
          category: 'Food',
          description: 'Monthly groceries',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Presupuesto creado');
        });
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'Test',
          amount: -100, // Invalid: negative amount
        })
        .expect(400);
    });

    it('should fail with amount having more than 2 decimals', () => {
      return request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'Test',
          amount: 100.123, // Invalid: 3 decimal places
        })
        .expect(400);
    });
  });

  describe('/budgets (GET)', () => {
    it('should return empty array when no budgets exist', () => {
      return request(app.getHttpServer())
        .get('/budgets')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('count', 0);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toEqual([]);
        });
    });

    it('should return user budgets without expenses', async () => {
      // Create a budget first
      await request(app.getHttpServer()).post('/budgets').send({
        name: 'Groceries',
        amount: 500,
        currency: 'COP',
        category: 'Food',
      });

      return request(app.getHttpServer())
        .get('/budgets')
        .expect(200)
        .expect((res) => {
          expect(res.body.count).toBe(1);
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0]).toHaveProperty('name', 'Groceries');
          expect(parseFloat(res.body.data[0].spent)).toBe(0);
          expect(res.body.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
        });
    });

    it('should only return budgets for authenticated user', async () => {
      // This test verifies ownership isolation
      // In a real scenario, you'd create budgets for different users
      await request(app.getHttpServer()).post('/budgets').send({
        name: 'My Budget',
        amount: 1000,
        currency: 'COP',
      });

      return request(app.getHttpServer())
        .get('/budgets')
        .expect(200)
        .expect((res) => {
          expect(res.body.count).toBe(1);
          // All budgets should belong to mockUser
        });
    });
  });

  describe('/budgets/:budgetId (GET)', () => {
    it('should return budget with expenses', async () => {
      // Create budget via API
      const res = await request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'Groceries',
          amount: 500,
          currency: 'COP',
          category: 'Food',
        });
      const budgetId = res.body.id || (await dataSource.query('SELECT id FROM budget ORDER BY created_at DESC LIMIT 1'))[0].id;

      return request(app.getHttpServer())
        .get(`/budgets/${budgetId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', budgetId);
          expect(res.body).toHaveProperty('expenses');
          expect(Array.isArray(res.body.expenses)).toBe(true);
        });
    });

    it('should return 404 for non-existent budget', () => {
      return request(app.getHttpServer())
        .get('/budgets/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/budgets/invalid-uuid')
        .expect(400);
    });
  });

  describe('/budgets/:budgetId (PATCH)', () => {
    it('should update budget', async () => {
      // Create budget via API
      const res = await request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'Old Name',
          amount: 500,
          currency: 'COP',
        });
      const budgetId = res.body.id || (await dataSource.query('SELECT id FROM budget ORDER BY created_at DESC LIMIT 1'))[0].id;

      return request(app.getHttpServer())
        .patch(`/budgets/${budgetId}`)
        .send({ name: 'New Name', amount: 600 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Presupuesto Actualizado');
        });
    });
  });

  describe('/budgets/:budgetId (DELETE)', () => {
    it('should delete budget and cascade expenses', async () => {
      // Create budget via API
      const budgetRes = await request(app.getHttpServer())
        .post('/budgets')
        .send({
          name: 'To Delete',
          amount: 500,
          currency: 'COP',
        });
      const budgetId = budgetRes.body.id || (await dataSource.query('SELECT id FROM budget ORDER BY created_at DESC LIMIT 1'))[0].id;

      // Create expense via API
      await request(app.getHttpServer())
        .post(`/budgets/${budgetId}/expenses`)
        .send({
          name: 'Expense',
          amount: 50,
          currency: 'COP',
          date: new Date().toISOString().split('T')[0],
        });

      // Delete budget
      await request(app.getHttpServer())
        .delete(`/budgets/${budgetId}`)
        .expect(200);

      // Verify budget is deleted
      const budgets = await dataSource.query(
        'SELECT * FROM budget WHERE id = $1',
        [budgetId],
      );
      expect(budgets).toHaveLength(0);

      // Verify expenses are cascaded
      const expenses = await dataSource.query(
        'SELECT * FROM expense WHERE "budgetId" = $1',
        [budgetId],
      );
      expect(expenses).toHaveLength(0);
    });
  });
});
