/**
 * How an expense was paid. Generic on purpose: a card, cash or a
 * transfer means the same to anyone, however they organise envelopes.
 */
export const PAYMENT_METHOD_TYPES = [
  'credit_card',
  'debit_card',
  'cash',
  'transfer',
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

/** Only a credit card has a statement cut-off day. */
export const TYPES_WITH_CUT_DAY: readonly PaymentMethodType[] = ['credit_card'];
