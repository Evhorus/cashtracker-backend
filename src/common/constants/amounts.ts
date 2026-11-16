/**
 * The largest amount a `decimal(12, 2)` column holds - the precision of
 * `expense.amount` and `envelope.amount`. Above it the insert fails with
 * a bare 500; validating against it turns that into a readable 400. The
 * web forms enforce the same ceiling (MAX_AMOUNT in
 * cashtracker-frontend/src/shared/lib/validation.ts).
 */
export const MAX_AMOUNT = 9_999_999_999.99;
