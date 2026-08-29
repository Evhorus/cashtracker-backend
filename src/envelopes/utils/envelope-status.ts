/**
 * Envelope spending status - the single source of truth for it.
 *
 * This lives in the backend on purpose. The status is derived from
 * `amount` and `spent`, so any client could compute it, and the web
 * frontend used to: it had its own copy of the 80% threshold and its own
 * edge-case handling. That only works while there is exactly one client.
 * A second one (a mobile app) would have to reimplement the same rules,
 * and the moment the two disagree the same envelope shows a different
 * status depending on which app you opened. So the API now reports the
 * status it derived, and the threshold below is the only place the number
 * exists.
 *
 * An envelope's `amount` is a soft limit, not a hard cap: going over it
 * is allowed and only surfaces as a warning. Nothing here blocks any
 * operation - it is purely informational, the same pattern
 * YNAB/Goodbudget use for category budgets.
 */

/**
 * Share of the limit at which an envelope starts warning - an early
 * heads-up before actually going over. Changing this changes both the
 * status reported per envelope and the `?status=` filter, because the
 * SQL below is built from this same constant.
 */
export const ENVELOPE_WARNING_THRESHOLD = 0.8;

export const ENVELOPE_PROGRESS_STATUSES = [
  'unlimited',
  'normal',
  'warning',
  'exceeded',
] as const;

export type EnvelopeProgressStatus =
  (typeof ENVELOPE_PROGRESS_STATUSES)[number];

/**
 * What the list endpoint can filter by: "all", any single status, or
 * `alert` - which merges `warning` and `exceeded` ("needs your
 * attention") and so overlaps them rather than partitioning the list the
 * way the others do.
 */
export const ENVELOPE_STATUS_FILTERS = [
  'all',
  // One filter per status, so a client's tab labels can be the status
  // words themselves rather than a second vocabulary. Added because the
  // web app's tabs read "Activos"/"En alerta" while the same envelopes'
  // badges read "Controlado"/"En riesgo" - two vocabularies for one set
  // of states, on one screen.
  'normal',
  'warning',
  // Unions rather than states. `alert` (warning + exceeded, "needs your
  // attention") is what the summary page fetches for its alert widget
  // and count. `active` (normal + warning) is on its way out - it has no
  // consumer once the web app's tabs become the statuses themselves, and
  // no word named it honestly, since an envelope is never activated or
  // deactivated. Kept for this release only so the already-deployed
  // frontend, which still sends it, keeps working: the backend expands
  // first, the client switches, then this contracts.
  'active',
  'alert',
  'exceeded',
  'unlimited',
] as const;

export type EnvelopeStatusFilter = (typeof ENVELOPE_STATUS_FILTERS)[number];

/**
 * `amount` and `spent` are `decimal` columns. TypeORM hands those back as
 * strings at runtime even though the entity types them `number`, so
 * everything here coerces rather than trusting the declared type.
 */
function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Derive an envelope's status from its limit and its spend.
 *
 * `amount === null` means an unlimited envelope (a running counter with
 * no cap), which is a distinct state rather than a limit of zero.
 */
export function deriveEnvelopeStatus(
  amount: number | string | null,
  spent: number | string,
): EnvelopeProgressStatus {
  if (amount === null) return 'unlimited';

  const limit = toNumber(amount);
  const used = toNumber(spent);

  // A non-positive limit has no meaningful ratio to compare against, so
  // it is "exceeded" the moment anything is spent and "normal"
  // otherwise. Without this branch, `used / limit` would divide by zero
  // (or flip sign on a negative limit) and misreport both cases.
  if (limit <= 0) return used > 0 ? 'exceeded' : 'normal';

  const ratio = used / limit;
  if (ratio > 1) return 'exceeded';
  if (ratio >= ENVELOPE_WARNING_THRESHOLD) return 'warning';
  return 'normal';
}

/**
 * The same rules as `deriveEnvelopeStatus`, expressed as a SQL predicate
 * so the list endpoint can filter and count in the database instead of
 * fetching everything and filtering in memory.
 *
 * These two implementations have to agree, which is why they are in the
 * same file and share `ENVELOPE_WARNING_THRESHOLD`, and why
 * envelope-status.spec.ts checks every boundary value against both. The
 * `amount <= 0` branches exist for exactly the reason described in
 * `deriveEnvelopeStatus` - dropping them is the easy way to make the
 * filter and the reported status silently disagree on a zero or negative
 * limit.
 *
 * `alias` is the query builder's alias for the envelope table.
 * Comparisons stay in SQL numerics (Postgres `decimal` is exact), so
 * there is no float rounding to reconcile with the TypeScript side.
 */
export function buildEnvelopeStatusPredicate(
  filter: EnvelopeStatusFilter,
  alias = 'envelope',
): { clause: string; params: Record<string, unknown> } | null {
  const amount = `${alias}.amount`;
  const spent = `${alias}.spent`;
  const params = { warningThreshold: ENVELOPE_WARNING_THRESHOLD };

  switch (filter) {
    case 'all':
      return null;

    case 'unlimited':
      return { clause: `${amount} IS NULL`, params: {} };

    case 'exceeded':
      return {
        clause:
          `${amount} IS NOT NULL AND (` +
          `(${amount} > 0 AND ${spent} > ${amount}) OR ` +
          `(${amount} <= 0 AND ${spent} > 0))`,
        params: {},
      };

    // Mirrors deriveEnvelopeStatus's `ratio < threshold` branch, plus
    // its non-positive-limit case (no meaningful ratio, so "normal"
    // until anything is spent).
    case 'normal':
      return {
        clause:
          `${amount} IS NOT NULL AND (` +
          `(${amount} > 0 AND ${spent} < ${amount} * :warningThreshold) OR ` +
          `(${amount} <= 0 AND ${spent} <= 0))`,
        params,
      };

    // At or past the threshold but not over the limit. A non-positive
    // limit can never be "warning" - it goes straight from normal to
    // exceeded - which is why there is no second branch here.
    case 'warning':
      return {
        clause:
          `${amount} > 0 AND ${spent} >= ${amount} * :warningThreshold ` +
          `AND ${spent} <= ${amount}`,
        params,
      };

    // normal + warning
    case 'active':
      return {
        clause:
          `${amount} IS NOT NULL AND (` +
          `(${amount} > 0 AND ${spent} <= ${amount}) OR ` +
          `(${amount} <= 0 AND ${spent} <= 0))`,
        params: {},
      };

    // warning + exceeded
    case 'alert':
      return {
        clause:
          `${amount} IS NOT NULL AND (` +
          `(${amount} > 0 AND ${spent} >= ${amount} * :warningThreshold) OR ` +
          `(${amount} <= 0 AND ${spent} > 0))`,
        params,
      };
  }
}

/** Whether a status belongs under one of the filter groupings above. */
export function statusMatchesFilter(
  status: EnvelopeProgressStatus,
  filter: EnvelopeStatusFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'unlimited':
      return status === 'unlimited';
    case 'exceeded':
      return status === 'exceeded';
    case 'normal':
      return status === 'normal';
    case 'warning':
      return status === 'warning';
    case 'active':
      return status === 'normal' || status === 'warning';
    case 'alert':
      return status === 'warning' || status === 'exceeded';
  }
}
