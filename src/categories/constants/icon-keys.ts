/**
 * Curated icon keys a Category can use. Kept as a fixed whitelist (rather
 * than freeform text) so every category renders a real, known icon on the
 * client - the frontend maps each key to a LucideIcon component in
 * `src/features/categories/lib/icon-registry.ts`. Keep both lists in sync.
 */
export const ICON_KEYS = [
  'house',
  'car',
  'piggy-bank',
  'briefcase',
  'user',
  'paw-print',
  'plane',
  'ticket',
  'heart',
  'shopping-bag',
  'utensils',
  'graduation-cap',
  'gift',
  'zap',
  'tag',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];
