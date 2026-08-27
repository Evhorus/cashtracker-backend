/**
 * Curated color swatches a Category can use - all share the app's
 * `--primary` lightness/chroma (0.7 0.13), only hue varies, so any
 * combination stays inside the same "family of accents" the rest of the
 * app's category colors already follow. Fixed whitelist (not freeform)
 * for the same reason icon is - keeps the create-category form to a
 * simple swatch picker instead of a full color picker.
 */
export const PRESET_COLORS = [
  'oklch(0.72 0.14 153)', // hogar / primary
  'oklch(0.7 0.13 211)', // transporte
  'oklch(0.7 0.13 182)', // ahorros
  'oklch(0.7 0.13 240)', // trabajo
  'oklch(0.7 0.13 269)', // personal
  'oklch(0.7 0.13 327)', // mascotas
  'oklch(0.7 0.13 124)', // viajes
  'oklch(0.7 0.13 298)', // entretenimiento
  'oklch(0.7 0.13 95)', // salud
  'oklch(0.7 0.13 30)',
  'oklch(0.7 0.13 60)',
  'oklch(0.7 0.13 350)',
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];
