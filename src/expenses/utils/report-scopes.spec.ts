import { resolveReportScopes } from './report-scopes';

const card = { id: 'card', cutDay: 15 };
const otherCard = { id: 'other', cutDay: 25 };
const cash = { id: 'cash', cutDay: null };
const methods = [card, otherCard, cash];

const october = { startDate: '2026-10-01', endDate: '2026-10-31' };

describe('resolveReportScopes', () => {
  it('selects every method and the unassigned ones when nothing is selected', () => {
    const scopes = resolveReportScopes(
      { period: 'month', month: '2026-10' },
      methods,
    );

    expect(scopes).toEqual([
      { paymentMethodId: 'card', ...october },
      { paymentMethodId: 'other', ...october },
      { paymentMethodId: 'cash', ...october },
      { paymentMethodId: null, ...october },
    ]);
  });

  it('keeps only the selected methods, without unassigned unless asked', () => {
    const scopes = resolveReportScopes(
      { period: 'month', month: '2026-10', paymentMethodIds: ['cash'] },
      methods,
    );

    expect(scopes).toEqual([{ paymentMethodId: 'cash', ...october }]);
  });

  it('can select only the expenses without a payment method', () => {
    const scopes = resolveReportScopes(
      { period: 'month', month: '2026-10', includeUnassigned: true },
      methods,
    );

    expect(scopes).toEqual([{ paymentMethodId: null, ...october }]);
  });

  it('gives each card its own statement cycle and the rest the calendar month', () => {
    const scopes = resolveReportScopes(
      { period: 'cycle', month: '2026-10' },
      methods,
    );

    expect(scopes).toEqual([
      {
        paymentMethodId: 'card',
        startDate: '2026-09-16',
        endDate: '2026-10-15',
      },
      {
        paymentMethodId: 'other',
        startDate: '2026-09-26',
        endDate: '2026-10-25',
      },
      { paymentMethodId: 'cash', ...october },
      { paymentMethodId: null, ...october },
    ]);
  });

  it('uses the custom range for everything', () => {
    const range = { startDate: '2026-01-10', endDate: '2026-03-05' };
    const scopes = resolveReportScopes(
      {
        period: 'custom',
        ...range,
        paymentMethodIds: ['card'],
        includeUnassigned: true,
      },
      methods,
    );

    expect(scopes).toEqual([
      { paymentMethodId: 'card', ...range },
      { paymentMethodId: null, ...range },
    ]);
  });

  it("ignores ids that are not one of the user's methods", () => {
    const scopes = resolveReportScopes(
      { period: 'month', month: '2026-10', paymentMethodIds: ['someone-else'] },
      methods,
    );

    expect(scopes).toEqual([]);
  });
});
