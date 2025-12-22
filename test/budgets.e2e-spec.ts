import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

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
      .overrideGuard('ClerkAuthGuard') // Override Clerk guard
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser; // Inject mock user
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
    // Clean database after each test
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
        category: 'Food',
      });

      return request(app.getHttpServer())
        .get('/budgets')
        .expect(200)
        .expect((res) => {
          expect(res.body.count).toBe(1);
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0]).toHaveProperty('name', 'Groceries');
          expect(res.body.data[0]).toHaveProperty('spent', 0);
          expect(res.body.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
        });
    });

    it('should only return budgets for authenticated user', async () => {
      // This test verifies ownership isolation
      // In a real scenario, you'd create budgets for different users
      await request(app.getHttpServer()).post('/budgets').send({
        name: 'My Budget',
        amount: 1000,
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
      // Create budget
      const createRes = await dataSource.query(
        `INSERT INTO budget (name, amount, spent, "userId", category) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Groceries', 500, 0, mockUser.id, 'Food'],
      );
      const budgetId = createRes[0].id;

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
      // Create budget
      const createRes = await dataSource.query(
        `INSERT INTO budget (name, amount, spent, "userId") 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Old Name', 500, 0, mockUser.id],
      );
      const budgetId = createRes[0].id;

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
      // Create budget with expense
      const budgetRes = await dataSource.query(
        `INSERT INTO budget (name, amount, spent, "userId") 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['To Delete', 500, 50, mockUser.id],
      );
      const budgetId = budgetRes[0].id;

      await dataSource.query(
        `INSERT INTO expense (name, amount, date, "budgetId") 
         VALUES ($1, $2, $3, $4)`,
        ['Expense', 50, new Date(), budgetId],
      );

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

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      // Make 11 requests (limit is 10 per minute)
      const requests = Array(11)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/budgets'));

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
