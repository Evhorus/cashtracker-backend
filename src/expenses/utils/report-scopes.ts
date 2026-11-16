import type { ReportPeriod } from '../dto/expenses-report-query.dto';
import {
  calendarMonthRange,
  statementCycleRange,
  type DateRange,
} from './report-period';

export interface ReportQuery {
  period: ReportPeriod;
  month?: string;
  startDate?: string;
  endDate?: string;
  paymentMethodIds?: string[];
  includeUnassigned?: boolean;
}

/** The fields of a payment method this needs. */
export interface ReportPaymentMethod {
  id: string;
  cutDay: number | null;
}

/** One payment method (null = expenses without one) and its date range. */
export interface ReportScope extends DateRange {
  paymentMethodId: string | null;
}

/** The range used by anything that has no statement cycle of its own. */
function baseRange(query: ReportQuery): DateRange {
  if (query.period === 'custom') {
    return { startDate: query.startDate!, endDate: query.endDate! };
  }
  return calendarMonthRange(query.month!);
}

function rangeFor(method: ReportPaymentMethod, query: ReportQuery): DateRange {
  if (query.period === 'cycle' && method.cutDay !== null) {
    return statementCycleRange(method.cutDay, query.month!);
  }
  return baseRange(query);
}

/**
 * Which payment methods the report covers and the dates for each.
 * Nothing selected means everything, unassigned expenses included. Ids
 * that are not the user's own are dropped, so they match nothing.
 */
export function resolveReportScopes(
  query: ReportQuery,
  userMethods: ReportPaymentMethod[],
): ReportScope[] {
  const requestedIds = query.paymentMethodIds ?? [];
  const selectsEverything =
    requestedIds.length === 0 && !query.includeUnassigned;

  const methods = selectsEverything
    ? userMethods
    : userMethods.filter((method) => requestedIds.includes(method.id));

  const scopes: ReportScope[] = methods.map((method) => ({
    paymentMethodId: method.id,
    ...rangeFor(method, query),
  }));

  if (selectsEverything || query.includeUnassigned) {
    scopes.push({ paymentMethodId: null, ...baseRange(query) });
  }
  return scopes;
}
