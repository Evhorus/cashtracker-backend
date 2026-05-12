import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Budget } from '../src/budgets/entities/budget.entity';

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
    await dataSource.query('DELETE FROM budget');
  });

  describe('/budgets/:budgetId/expenses (POST)', () => {
    it('should create an expense and update budget spent amount', async () => {
      // 1. Create a budget using Repository
      const budgetRepo = dataSource.getRepository(Budget);
      const budget = await budgetRepo.save({
        name: 'Test Budget',
        amount: 1000,
        spent: 0,
        userId: mockUser.id,
      });
      const budgetId = budget.id;

      // 2. Add an expense
      await request(app.getHttpServer())
        .post(`/budgets/${budgetId}/expenses`)
        .send({
          name: 'Coffee',
          amount: 5,
          date: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      // 3. Verify budget spent amount was updated
      const updatedBudget = await budgetRepo.findOneBy({ id: budgetId });
      expect(parseFloat(updatedBudget!.spent as any)).toBe(5);
    });

    it('should fail if budget belongs to another user', async () => {
      const budgetRepo = dataSource.getRepository(Budget);
      const budget = await budgetRepo.save({
        name: 'Other Budget',
        amount: 1000,
        spent: 0,
        userId: 'other_user_id',
      });

      await request(app.getHttpServer())
        .post(`/budgets/${budget.id}/expenses`)
        .send({ name: 'Steal', amount: 100, date: '2024-05-12' })
        .expect(401);
    });
  });

  describe('/budgets/:budgetId/expenses (GET)', () => {
    it('should return expenses with filters', async () => {
      const budgetRepo = dataSource.getRepository(Budget);
      const budget = await budgetRepo.save({
        name: 'Filter Test',
        amount: 1000,
        spent: 0,
        userId: mockUser.id,
      });

      // Insert 2 expenses manually or via service, but here we use SQL for speed
      await dataSource.query(
        'INSERT INTO expense (name, amount, date, "budgetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
        [
          'Food',
          10,
          '2024-01-01',
          budget.id,
          'Tools',
          20,
          '2024-02-01',
          budget.id,
        ],
      );

      const res = await request(app.getHttpServer())
        .get(`/budgets/${budget.id}/expenses`)
        .query({ search: 'Food' })
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Food');
    });
  });
});
