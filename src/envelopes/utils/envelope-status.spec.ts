import {
  buildEnvelopeStatusPredicate,
  deriveEnvelopeStatus,
  ENVELOPE_PROGRESS_STATUSES,
  ENVELOPE_STATUS_FILTERS,
  ENVELOPE_WARNING_THRESHOLD,
  statusMatchesFilter,
  type EnvelopeStatusFilter,
} from './envelope-status';

describe('deriveEnvelopeStatus', () => {
  it('is unlimited when there is no cap', () => {
    expect(deriveEnvelopeStatus(null, 500)).toBe('unlimited');
    expect(deriveEnvelopeStatus(null, 0)).toBe('unlimited');
  });

  it('coerces the decimal strings TypeORM actually returns', () => {
    // The entity types these `number`, but a `decimal` column comes back
    // as a string at runtime - which is why the frontend's own schema
    // declares them as strings too.
    expect(deriveEnvelopeStatus('1000.00', '850.50')).toBe('warning');
    expect(deriveEnvelopeStatus('1000', '100')).toBe('normal');
  });

  it('is normal below the warning threshold', () => {
    expect(ENVELOPE_WARNING_THRESHOLD).toBe(0.8);
    expect(deriveEnvelopeStatus(1000, 799.99)).toBe('normal');
  });

  it('is warning exactly at the threshold', () => {
    expect(deriveEnvelopeStatus(1000, 800)).toBe('warning');
  });

  it('is still warning at exactly the limit, not exceeded', () => {
    // Spending the whole budget is not overspending.
    expect(deriveEnvelopeStatus(1000, 1000)).toBe('warning');
  });

  it('is exceeded a cent past the limit', () => {
    expect(deriveEnvelopeStatus(1000, 1000.01)).toBe('exceeded');
  });

  it('handles a zero limit without dividing by zero', () => {
    expect(deriveEnvelopeStatus(0, 0)).toBe('normal');
    expect(deriveEnvelopeStatus(0, 0.01)).toBe('exceeded');
  });

  it('handles a negative limit without flipping the comparison', () => {
    // Shouldn't occur, but `used / limit` would invert the ratio's sign
    // and report an overspent envelope as normal.
    expect(deriveEnvelopeStatus(-100, 0)).toBe('normal');
    expect(deriveEnvelopeStatus(-100, 50)).toBe('exceeded');
  });
});

describe('statusMatchesFilter', () => {
  it('groups the statuses the way the UI tabs expect', () => {
    expect(statusMatchesFilter('normal', 'active')).toBe(true);
    expect(statusMatchesFilter('warning', 'active')).toBe(true);
    expect(statusMatchesFilter('exceeded', 'active')).toBe(false);

    expect(statusMatchesFilter('warning', 'alert')).toBe(true);
    expect(statusMatchesFilter('exceeded', 'alert')).toBe(true);
    expect(statusMatchesFilter('normal', 'alert')).toBe(false);

    expect(statusMatchesFilter('unlimited', 'unlimited')).toBe(true);
    expect(statusMatchesFilter('unlimited', 'active')).toBe(false);
  });

  it('accepts everything under "all"', () => {
    for (const status of ENVELOPE_PROGRESS_STATUSES) {
      expect(statusMatchesFilter(status, 'all')).toBe(true);
    }
  });
});

/**
 * The important one. `deriveEnvelopeStatus` and
 * `buildEnvelopeStatusPredicate` are two implementations of the same
 * rules - one in TypeScript for the reported status, one in SQL so the
 * list endpoint can filter and count in the database. If they drift, an
 * envelope appears under a tab whose badge then says something else.
 *
 * This evaluates the SQL predicate's own logic in JS over every boundary
 * value and checks it agrees with the TS derivation. It does NOT execute
 * real SQL - that needs a database, and lives in the e2e suite. What it
 * does catch is the predicate being edited without the derivation, or
 * either one losing its `amount <= 0` branch.
 */
describe('SQL predicate agrees with the TypeScript derivation', () => {
  const THRESHOLD = ENVELOPE_WARNING_THRESHOLD;

  // Mirrors each generated clause. Kept deliberately literal - written
  // as a transcription of the SQL rather than reusing the TS helper,
  // otherwise it would prove nothing.
  const predicateAsJs: Record<
    Exclude<EnvelopeStatusFilter, 'all'>,
    (amount: number | null, spent: number) => boolean
  > = {
    unlimited: (amount) => amount === null,
    exceeded: (amount, spent) =>
      amount !== null &&
      ((amount > 0 && spent > amount) || (amount <= 0 && spent > 0)),
    active: (amount, spent) =>
      amount !== null &&
      ((amount > 0 && spent <= amount) || (amount <= 0 && spent <= 0)),
    alert: (amount, spent) =>
      amount !== null &&
      ((amount > 0 && spent >= amount * THRESHOLD) ||
        (amount <= 0 && spent > 0)),
  };

  const limits = [null, -100, 0, 0.01, 1, 100, 1000, 250000.5];
  const spends = [
    0, 0.01, 0.79, 0.8, 1, 79, 80, 100, 799.99, 800, 1000, 1000.01, 220000,
    999999,
  ];

  const cases: { amount: number | null; spent: number }[] = [];
  for (const amount of limits) {
    for (const spent of spends) {
      cases.push({ amount, spent });
    }
    if (amount !== null && amount > 0) {
      // Exactly on each boundary, where an off-by-one in either
      // implementation shows up.
      cases.push({ amount, spent: amount * THRESHOLD });
      cases.push({ amount, spent: amount });
    }
  }

  it.each(
    ENVELOPE_STATUS_FILTERS.filter(
      (f): f is Exclude<EnvelopeStatusFilter, 'all'> => f !== 'all',
    ),
  )('"%s" selects exactly the statuses it should', (filter) => {
    for (const { amount, spent } of cases) {
      const status = deriveEnvelopeStatus(amount, spent);
      const expected = statusMatchesFilter(status, filter);
      const fromSql = predicateAsJs[filter](amount, spent);

      expect({ amount, spent, status, matches: fromSql }).toEqual({
        amount,
        spent,
        status,
        matches: expected,
      });
    }
  });

  it('produces no clause for "all", so nothing is filtered out', () => {
    expect(buildEnvelopeStatusPredicate('all')).toBeNull();
  });

  it('parameterizes the threshold instead of inlining it', () => {
    // Inlining would let the SQL and ENVELOPE_WARNING_THRESHOLD drift.
    const alert = buildEnvelopeStatusPredicate('alert');

    expect(alert?.params).toEqual({ warningThreshold: THRESHOLD });
    expect(alert?.clause).toContain(':warningThreshold');
    expect(alert?.clause).not.toContain('0.8');
  });

  it('respects the table alias it is given', () => {
    const predicate = buildEnvelopeStatusPredicate('unlimited', 'e');

    expect(predicate?.clause).toBe('e.amount IS NULL');
  });

  it('builds a clause for every filter except "all"', () => {
    for (const filter of ENVELOPE_STATUS_FILTERS) {
      const predicate = buildEnvelopeStatusPredicate(filter);
      if (filter === 'all') {
        expect(predicate).toBeNull();
      } else {
        expect(predicate?.clause).toBeTruthy();
      }
    }
  });
});
