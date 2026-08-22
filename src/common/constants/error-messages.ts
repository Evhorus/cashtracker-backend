/**
 * Error messages constants
 * Centralized error messages for consistency across the application
 */

export const ERROR_MESSAGES = {
  // Envelope errors
  ENVELOPE_NOT_FOUND: 'Envelope not found',
  ENVELOPE_UNAUTHORIZED: 'You do not have access to this envelope',
  ENVELOPE_INVALID_UUID: 'Invalid envelope ID format',

  // Expense errors
  EXPENSE_NOT_FOUND: 'Expense not found',
  EXPENSE_UNAUTHORIZED: 'You do not have access to this expense',
  EXPENSE_INVALID_UUID: 'Invalid expense ID format',

  // Validation errors
  AMOUNT_MUST_BE_POSITIVE: 'Amount must be greater than 0',
  INVALID_DATE_FORMAT: 'Date must be in YYYY-MM-DD format',

  // Auth errors
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
  INVALID_REQUEST: 'Invalid request',
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
