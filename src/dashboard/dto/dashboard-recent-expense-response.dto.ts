/**
 * One row of the "Actividad reciente" widget on the Resumen page: the
 * expense itself plus just enough of its parent envelope (name only,
 * not the full envelope) to label which envelope it belongs to - e.g.
 * "Supermercado Éxito · Mercado · 12 ago". Deliberately not the same
 * shape as ExpenseResponseDto (expenses module) - this is a
 * cross-envelope reporting view, not a single envelope's expense list.
 */
export class DashboardRecentExpenseDto {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  envelopeId: string;
  envelopeName: string;
}
