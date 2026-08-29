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

  /**
   * Creates a category and returns its id. Envelopes reference categories
   * by id now, so a test that wants a classified envelope has to make the
   * category first - which is also what the app does.
   */
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

  describe('/envelopes (POST)', () => {
    it('should create a new envelope', async () => {
      const categoryId = await createCategory('Food');

      return request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Groceries',
          amount: 500,
          currency: 'COP',
          categoryId,
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
      const categoryId = await createCategory('Food');
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        amount: 500,
        currency: 'COP',
        categoryId,
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
      const foodId = await createCategory('Food');
      const housingId = await createCategory('Housing');
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        currency: 'COP',
        categoryId: foodId,
      });
      await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Rent',
        currency: 'COP',
        categoryId: housingId,
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
      const categoryId = await createCategory('Food');
      const res = await request(app.getHttpServer()).post('/envelopes').send({
        name: 'Groceries',
        amount: 500,
        currency: 'COP',
        categoryId,
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

  /**
   * The status filter, executed by Postgres rather than transcribed to
   * JS. envelope-status.spec.ts already proves the SQL predicate and the
   * TypeScript derivation agree in their reasoning; only a real database
   * can prove the SQL is valid and that Postgres evaluates it the same
   * way - `decimal` comparisons and `amount * :threshold` in particular.
   *
   * Spends are set by posting expenses, the same path the app uses, so
   * `spent` is maintained by the service instead of being written
   * directly.
   */
  describe('/envelopes?status= (GET)', () => {
    /** Creates an envelope and spends `spent` against it. */
    async function seed(
      name: string,
      amount: number | null,
      spent: number,
    ): Promise<string> {
      const created = await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name, amount, currency: 'COP' })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/envelopes')
        .query({ limit: 100 })
        .expect(200);

      const envelope = (
        list.body as { data: { id: string; name: string }[] }
      ).data.find((e) => e.name === name);
      if (!envelope) throw new Error(`seed failed for ${name}`);
      expect(created.body).toBeDefined();

      if (spent > 0) {
        await request(app.getHttpServer())
          .post(`/envelopes/${envelope.id}/expenses`)
          .send({
            name: `${name} gasto`,
            amount: spent,
            currency: 'COP',
            date: '2026-08-20',
          })
          .expect(201);
      }

      return envelope.id;
    }

    async function namesFor(status: string): Promise<string[]> {
      const res = await request(app.getHttpServer())
        .get('/envelopes')
        .query({ status, limit: 100 })
        .expect(200);
      const body = res.body as {
        data: { name: string }[];
        meta: { total: number };
      };
      // total must reflect the filter, not the unfiltered count - that is
      // the whole reason this filters in SQL.
      expect(body.meta.total).toBe(body.data.length);
      return body.data.map((e) => e.name).sort();
    }

    beforeEach(async () => {
      await seed('normal', 1000, 100); // 10%
      await seed('warning', 1000, 850); // 85%
      await seed('at-limit', 1000, 1000); // 100% -> still warning
      await seed('exceeded', 1000, 1200); // 120%
      await seed('unlimited', null, 500);
    });

    it('reports the derived status on every envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/envelopes')
        .query({ limit: 100 })
        .expect(200);

      const byName = new Map(
        (res.body as { data: { name: string; status: string }[] }).data.map(
          (e) => [e.name, e.status],
        ),
      );

      expect(byName.get('normal')).toBe('normal');
      expect(byName.get('warning')).toBe('warning');
      expect(byName.get('at-limit')).toBe('warning');
      expect(byName.get('exceeded')).toBe('exceeded');
      expect(byName.get('unlimited')).toBe('unlimited');
    });

    it('filters "active" to limited envelopes not yet over', async () => {
      expect(await namesFor('active')).toEqual([
        'at-limit',
        'normal',
        'warning',
      ]);
    });

    it('filters "alert" to warning and exceeded', async () => {
      expect(await namesFor('alert')).toEqual([
        'at-limit',
        'exceeded',
        'warning',
      ]);
    });

    it('filters "exceeded" to only those past the limit', async () => {
      expect(await namesFor('exceeded')).toEqual(['exceeded']);
    });

    it('filters "unlimited" to envelopes with no cap', async () => {
      expect(await namesFor('unlimited')).toEqual(['unlimited']);
    });

    it('returns everything for "all"', async () => {
      expect(await namesFor('all')).toHaveLength(5);
    });

    it('rejects an unknown status instead of ignoring it', async () => {
      await request(app.getHttpServer())
        .get('/envelopes')
        .query({ status: 'bogus' })
        .expect(400);
    });

    it('combines status with search', async () => {
      const res = await request(app.getHttpServer())
        .get('/envelopes')
        .query({ status: 'alert', search: 'exceed' })
        .expect(200);

      const body = res.body as { data: { name: string }[] };
      expect(body.data.map((e) => e.name)).toEqual(['exceeded']);
    });
  });

  /**
   * The bug the foreign key exists to fix. As free text, renaming a
   * category left every envelope holding the old string: it stopped
   * resolving to any category, lost its icon and colour, and the renamed
   * category's own envelope count dropped to zero - silently, with no
   * error anywhere. Deleting behaved the same way.
   */
  describe('category lifecycle', () => {
    it('keeps envelopes attached when their category is renamed', async () => {
      const categoryId = await createCategory('Suscripciones QA');
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name: 'Streaming', currency: 'COP', categoryId })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .send({ label: 'Suscripciones renombrada' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/envelopes')
        .expect(200);
      const [envelope] = (
        res.body as {
          data: { category: { id: string; label: string } | null }[];
        }
      ).data;

      expect(envelope.category).not.toBeNull();
      expect(envelope.category?.id).toBe(categoryId);
      // The new name, not the one it was created with.
      expect(envelope.category?.label).toBe('Suscripciones renombrada');
    });

    it('unclassifies envelopes when their category is deleted', async () => {
      const categoryId = await createCategory('Suscripciones QA');
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({ name: 'Streaming', currency: 'COP', categoryId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/envelopes')
        .expect(200);
      const [envelope] = (
        res.body as { data: { name: string; category: unknown }[] }
      ).data;

      // ON DELETE SET NULL - the envelope survives, it just stops being
      // classified, rather than pointing at a category that is gone.
      expect(envelope.name).toBe('Streaming');
      expect(envelope.category).toBeNull();
    });

    it('rejects a category id belonging to someone else', async () => {
      // Shape-valid uuid, but not a category this user can see.
      await request(app.getHttpServer())
        .post('/envelopes')
        .send({
          name: 'Ajeno',
          currency: 'COP',
          categoryId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(404);
    });
  });
});
