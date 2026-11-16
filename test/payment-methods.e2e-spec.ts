import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { assertSafeTestDatabase } from './assert-safe-test-database';

/**
 * Payment methods are optional and per user. Someone who never creates
 * one must see expenses behave exactly as before; someone who does can
 * tag each expense with one, and deleting it never deletes expenses.
 */
describe('Payment methods (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const user = { id: 'user_test_payment_methods' };

  beforeAll(async () => {
    assertSafeTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClerkAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = user;
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
    await dataSource.query('DELETE FROM payment_method');
  });

  const COLOR = 'oklch(0.7 0.13 30)';

  async function createMethod(body: Record<string, unknown>) {
    await request(app.getHttpServer())
      .post('/payment-methods')
      .send({ type: 'credit_card', color: COLOR, ...body })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM payment_method ORDER BY created_at DESC LIMIT 1',
    );
    return id as string;
  }

  async function createEnvelope() {
    await request(app.getHttpServer())
      .post('/envelopes')
      .send({ name: 'Octubre', amount: 1000, currency: 'COP' })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
    );
    return id as string;
  }

  const expense = (over: Record<string, unknown> = {}) => ({
    name: 'Mercado',
    amount: 100,
    currency: 'COP',
    date: '2026-10-12',
    ...over,
  });

  it('creates one and lists it with its cut-off day', async () => {
    await createMethod({ name: 'Davivienda', cutDay: 15 });

    const res = await request(app.getHttpServer())
      .get('/payment-methods')
      .expect(200);

    expect(res.body).toEqual([
      expect.objectContaining({
        name: 'Davivienda',
        type: 'credit_card',
        cutDay: 15,
      }),
    ]);
  });

  it('drops the cut-off day for anything but a credit card', async () => {
    await createMethod({ name: 'Efectivo', type: 'cash', cutDay: 10 });

    const [row] = await dataSource.query('SELECT "cutDay" FROM payment_method');
    expect(row.cutDay).toBeNull();
  });

  it('refuses a duplicate name regardless of case', async () => {
    await createMethod({ name: 'Davivienda' });

    await request(app.getHttpServer())
      .post('/payment-methods')
      .send({ name: 'DAVIVIENDA', type: 'credit_card', color: COLOR })
      .expect(409);
  });

  it('rejects a cut-off day outside 1-31', async () => {
    await request(app.getHttpServer())
      .post('/payment-methods')
      .send({ name: 'Mala', type: 'credit_card', color: COLOR, cutDay: 32 })
      .expect(400);
  });

  it("hides another user's payment method behind a 404", async () => {
    await dataSource.query(
      `INSERT INTO payment_method ("userId", name, type, color) VALUES ('someone_else', 'Ajena', 'cash', $1)`,
      [COLOR],
    );
    const [{ id }] = await dataSource.query(
      `SELECT id FROM payment_method WHERE "userId" = 'someone_else'`,
    );

    await request(app.getHttpServer())
      .patch(`/payment-methods/${id}`)
      .send({ name: 'Mía' })
      .expect(404);

    const envelopeId = await createEnvelope();
    await request(app.getHttpServer())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send(expense({ paymentMethodId: id }))
      .expect(404);
  });

  it('tags an expense, returns it embedded, and clears it with null', async () => {
    const methodId = await createMethod({ name: 'Scotiabank' });
    const envelopeId = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send(expense({ paymentMethodId: methodId }))
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/envelopes/${envelopeId}/expenses`)
      .expect(200);
    const [tagged] = list.body.data;
    expect(tagged.paymentMethod).toEqual({
      id: methodId,
      name: 'Scotiabank',
      color: COLOR,
    });

    await request(app.getHttpServer())
      .patch(`/envelopes/${envelopeId}/expenses/${tagged.id}`)
      .send({ paymentMethodId: null })
      .expect(200);

    const one = await request(app.getHttpServer())
      .get(`/envelopes/${envelopeId}/expenses/${tagged.id}`)
      .expect(200);
    expect(one.body.paymentMethod).toBeNull();
  });

  it('keeps expenses as they were when none is used', async () => {
    const envelopeId = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send(expense())
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/envelopes/${envelopeId}/expenses`)
      .expect(200);
    expect(list.body.data[0].paymentMethod).toBeNull();
  });

  it('never deletes expenses when their payment method is deleted', async () => {
    const methodId = await createMethod({ name: 'Vieja' });
    const envelopeId = await createEnvelope();
    await request(app.getHttpServer())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send(expense({ paymentMethodId: methodId }))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/payment-methods/${methodId}`)
      .expect(200);

    const [row] = await dataSource.query(
      'SELECT count(*)::int AS n, max("paymentMethodId"::text) AS pm FROM expense',
    );
    expect(row).toEqual({ n: 1, pm: null });
    const [envelope] = await dataSource.query(
      'SELECT spent FROM envelope WHERE id = $1',
      [envelopeId],
    );
    expect(parseFloat(envelope.spent)).toBe(100);
  });

  describe('filtering an envelope by payment method', () => {
    async function seed() {
      const davivienda = await createMethod({ name: 'Davivienda' });
      const davibank = await createMethod({ name: 'Davibank' });
      const envelopeId = await createEnvelope();
      const add = (name: string, amount: number, paymentMethodId?: string) =>
        request(app.getHttpServer())
          .post(`/envelopes/${envelopeId}/expenses`)
          .send(expense({ name, amount, paymentMethodId }))
          .expect(201);
      await add('carulla', 100, davivienda);
      await add('exito', 200, davibank);
      await add('chatgpt', 50);
      return { davivienda, davibank, envelopeId };
    }

    const list = (envelopeId: string, query: Record<string, string>) =>
      request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}/expenses`)
        .query(query)
        .expect(200);

    const names = (body: { data: { name: string }[] }) =>
      body.data.map((row) => row.name).sort();

    it('keeps only the selected method, and totals only those', async () => {
      const { davivienda, envelopeId } = await seed();

      const res = await list(envelopeId, { paymentMethodIds: davivienda });

      expect(names(res.body)).toEqual(['carulla']);
      expect(res.body.meta.total).toBe(1);
      expect(Number(res.body.meta.totalAmount)).toBe(100);
    });

    it('takes several methods, and the ones without a method on request', async () => {
      const { davivienda, davibank, envelopeId } = await seed();

      const both = await list(envelopeId, {
        paymentMethodIds: `${davivienda},${davibank}`,
      });
      expect(names(both.body)).toEqual(['carulla', 'exito']);

      const withNone = await list(envelopeId, {
        paymentMethodIds: davibank,
        includeUnassigned: 'true',
      });
      expect(names(withNone.body)).toEqual(['chatgpt', 'exito']);
      expect(Number(withNone.body.meta.totalAmount)).toBe(250);

      const onlyNone = await list(envelopeId, { includeUnassigned: 'true' });
      expect(names(onlyNone.body)).toEqual(['chatgpt']);
    });

    it('orders by amount when asked, biggest first', async () => {
      const { envelopeId } = await seed();

      const biggest = await list(envelopeId, { sortBy: 'amount' });
      expect(
        biggest.body.data.map((row: { name: string }) => row.name),
      ).toEqual(['exito', 'carulla', 'chatgpt']);

      const smallest = await list(envelopeId, {
        sortBy: 'amount',
        sort: 'ASC',
      });
      expect(
        smallest.body.data.map((row: { name: string }) => row.name),
      ).toEqual(['chatgpt', 'carulla', 'exito']);
    });

    it('lists everything when nothing is selected', async () => {
      const { envelopeId } = await seed();

      const res = await list(envelopeId, {});

      expect(names(res.body)).toEqual(['carulla', 'chatgpt', 'exito']);
    });

    it('rejects an id that is not a uuid', async () => {
      const envelopeId = await createEnvelope();

      await request(app.getHttpServer())
        .get(`/envelopes/${envelopeId}/expenses`)
        .query({ paymentMethodIds: 'nope' })
        .expect(400);
    });
  });
});
