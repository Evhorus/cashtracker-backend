/**
 * Error messages constants
 * Centralized error messages for consistency across the application
 */

export const ERROR_MESSAGES = {
  // Envelope errors
  //
  // Note: there is deliberately no separate "unauthorized" message. A
  // caller who doesn't own an envelope/expense gets the same NOT_FOUND
  // response as one that doesn't exist at all - see EnvelopeExistsGuard /
  // ExpenseExistsGuard - so a different message here would defeat that.
  ENVELOPE_NOT_FOUND: 'Envelope not found',
  ENVELOPE_INVALID_UUID: 'Invalid envelope ID format',
  ENVELOPE_CURRENCY_LOCKED:
    'No puedes cambiar la moneda de un sobre que ya tiene gastos',

  // Expense errors
  EXPENSE_NOT_FOUND: 'Expense not found',
  EXPENSE_INVALID_UUID: 'Invalid expense ID format',
  EXPENSE_CURRENCY_MISMATCH: 'La moneda del gasto debe ser la misma del sobre',

  // Category errors
  CATEGORY_NOT_FOUND: 'Category not found',
  CATEGORY_ALREADY_EXISTS: 'Ya tienes una categoría con ese nombre',

  // Validation errors
  AMOUNT_MUST_BE_POSITIVE: 'Amount must be greater than 0',
  INVALID_DATE_FORMAT: 'La fecha debe tener el formato YYYY-MM-DD',
  INVALID_DATE_RANGE: 'La fecha final no puede ser anterior a la inicial',
  AMOUNT_TOO_LARGE: 'El monto supera el máximo permitido',

  // Auth errors
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
  INVALID_REQUEST: 'Invalid request',
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
