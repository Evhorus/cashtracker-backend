import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { assertSafeTestDatabase } from './assert-safe-test-database';

/**
 * The expenses report crosses envelopes: "everything I paid with this
 * card in its October statement", whichever envelope each expense sits
 * in. Each card follows its own cut day; anything without one follows
 * the calendar month.
 */
describe('Expenses report (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const user = { id: 'user_test_report' };

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
    user.id = 'user_test_report';
    await dataSource.query('DELETE FROM expense');
    await dataSource.query('DELETE FROM envelope');
    await dataSource.query('DELETE FROM payment_method');
  });

  const COLOR = 'oklch(0.7 0.13 30)';
  const server = () => app.getHttpServer();

  async function createMethod(body: Record<string, unknown>) {
    await request(server())
      .post('/payment-methods')
      .send({ type: 'credit_card', color: COLOR, ...body })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM payment_method ORDER BY created_at DESC LIMIT 1',
    );
    return id as string;
  }

  async function createEnvelope(name: string, currency = 'COP') {
    await request(server())
      .post('/envelopes')
      .send({ name, amount: 10_000_000, currency })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM envelope ORDER BY created_at DESC LIMIT 1',
    );
    return id as string;
  }

  async function addExpense(envelopeId: string, over: Record<string, unknown>) {
    await request(server())
      .post(`/envelopes/${envelopeId}/expenses`)
      .send({ name: 'Gasto', amount: 1000, currency: 'COP', ...over })
      .expect(201);
  }

  const report = (query: Record<string, string>) =>
    request(server()).get('/expenses/report').query(query);

  const names = (body: { expenses: { name: string }[] }) =>
    body.expenses.map((expense) => expense.name).sort();

  it("follows each card's own statement cycle across envelopes", async () => {
    const davivienda = await createMethod({ name: 'Davivienda', cutDay: 15 });
    const scotia = await createMethod({ name: 'Scotiabank', cutDay: 25 });
    const septiembre = await createEnvelope('Septiembre');
    const octubre = await createEnvelope('Octubre');

    // Davivienda's October statement is 16 Sep - 15 Oct.
    await addExpense(septiembre, {
      name: 'davi-in',
      date: '2026-09-20',
      paymentMethodId: davivienda,
    });
    await addExpense(octubre, {
      name: 'davi-in-2',
      date: '2026-10-15',
      paymentMethodId: davivienda,
    });
    await addExpense(octubre, {
      name: 'davi-out',
      date: '2026-10-16',
      paymentMethodId: davivienda,
    });
    // Scotiabank's is 26 Sep - 25 Oct.
    await addExpense(septiembre, {
      name: 'scotia-out',
      date: '2026-09-25',
      paymentMethodId: scotia,
    });
    await addExpense(octubre, {
      name: 'scotia-in',
      date: '2026-10-25',
      paymentMethodId: scotia,
    });

    const res = await report({
      period: 'cycle',
      month: '2026-10',
      paymentMethodIds: `${davivienda},${scotia}`,
    }).expect(200);

    expect(names(res.body)).toEqual(['davi-in', 'davi-in-2', 'scotia-in']);
    expect(res.body.scopes).toEqual([
      {
        paymentMethodId: davivienda,
        startDate: '2026-09-16',
        endDate: '2026-10-15',
      },
      {
        paymentMethodId: scotia,
        startDate: '2026-09-26',
        endDate: '2026-10-25',
      },
    ]);
    expect(res.body.expenses[0].envelope).toEqual(
      expect.objectContaining({ name: expect.any(String) }),
    );
  });

  it('includes expenses without a payment method only when asked', async () => {
    const card = await createMethod({ name: 'Davivienda' });
    const envelope = await createEnvelope('Octubre');
    await addExpense(envelope, {
      name: 'card',
      date: '2026-10-05',
      paymentMethodId: card,
    });
    await addExpense(envelope, { name: 'none', date: '2026-10-06' });

    const onlyCard = await report({
      period: 'month',
      month: '2026-10',
      paymentMethodIds: card,
    }).expect(200);
    expect(names(onlyCard.body)).toEqual(['card']);

    const withNone = await report({
      period: 'month',
      month: '2026-10',
      paymentMethodIds: card,
      includeUnassigned: 'true',
    }).expect(200);
    expect(names(withNone.body)).toEqual(['card', 'none']);

    const everything = await report({
      period: 'month',
      month: '2026-10',
    }).expect(200);
    expect(names(everything.body)).toEqual(['card', 'none']);
  });

  it('totals per currency and per payment method, never across currencies', async () => {
    const card = await createMethod({ name: 'Davivienda' });
    const pesos = await createEnvelope('Pesos', 'COP');
    const dolares = await createEnvelope('Dólares', 'USD');
    await addExpense(pesos, {
      amount: 1000.5,
      date: '2026-10-01',
      paymentMethodId: card,
    });
    await addExpense(pesos, {
      amount: 2000.25,
      date: '2026-10-02',
      paymentMethodId: card,
    });
    await addExpense(pesos, { amount: 300, date: '2026-10-03' });
    await addExpense(dolares, {
      amount: 12.1,
      currency: 'USD',
      date: '2026-10-04',
      paymentMethodId: card,
    });

    const res = await report({ period: 'month', month: '2026-10' }).expect(200);

    expect(res.body.totalsByCurrency).toEqual([
      { currency: 'COP', total: 3300.75 },
      { currency: 'USD', total: 12.1 },
    ]);
    expect(res.body.totalsByPaymentMethod).toEqual(
      expect.arrayContaining([
        { paymentMethodId: card, currency: 'COP', total: 3000.75, count: 2 },
        { paymentMethodId: card, currency: 'USD', total: 12.1, count: 1 },
        { paymentMethodId: null, currency: 'COP', total: 300, count: 1 },
      ]),
    );
  });

  it("never shows another user's expenses, even with their card's id", async () => {
    user.id = 'user_test_report_other';
    const theirCard = await createMethod({ name: 'Ajena' });
    const theirs = await createEnvelope('Ajeno');
    await addExpense(theirs, {
      name: 'theirs',
      date: '2026-10-05',
      paymentMethodId: theirCard,
    });

    user.id = 'user_test_report';
    const byTheirCard = await report({
      period: 'month',
      month: '2026-10',
      paymentMethodIds: theirCard,
    }).expect(200);
    expect(byTheirCard.body.expenses).toEqual([]);

    const everything = await report({
      period: 'month',
      month: '2026-10',
    }).expect(200);
    expect(everything.body.expenses).toEqual([]);
  });

  it('uses a custom range for everything', async () => {
    const envelope = await createEnvelope('Viaje');
    await addExpense(envelope, { name: 'before', date: '2026-01-09' });
    await addExpense(envelope, { name: 'inside', date: '2026-02-01' });
    await addExpense(envelope, { name: 'after', date: '2026-03-06' });

    const res = await report({
      period: 'custom',
      startDate: '2026-01-10',
      endDate: '2026-03-05',
    }).expect(200);
    expect(names(res.body)).toEqual(['inside']);
  });

  it.each([
    [{ period: 'month' }],
    [{ period: 'month', month: '2026-13' }],
    [{ period: 'custom', startDate: '2026-03-05' }],
    [{ period: 'custom', startDate: '2026-03-05', endDate: '2026-03-01' }],
    [{ period: 'week', month: '2026-10' }],
    [{ period: 'month', month: '2026-10', paymentMethodIds: 'not-a-uuid' }],
  ])('rejects an invalid query %j', async (query) => {
    await report(query).expect(400);
  });
});
