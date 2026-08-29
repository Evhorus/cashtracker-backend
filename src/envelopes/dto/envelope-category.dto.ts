import { Category } from '../../categories/entities/category.entity';

/**
 * The category an envelope belongs to, embedded in the envelope's own
 * response.
 *
 * Sent whole rather than as a bare id so clients can render the chip -
 * label, colour and icon - without a second request or a client-side
 * lookup against the category list. It used to be free text that each
 * client resolved itself, which is what let a renamed category silently
 * detach from its envelopes.
 */
export class EnvelopeCategoryDto {
  id: string;
  label: string;
  /** oklch() string from the backend's PRESET_COLORS whitelist. */
  color: string;
  /** Icon key from ICON_KEYS - the client maps it to its own component. */
  icon: string;

  static fromEntity(category?: Category | null): EnvelopeCategoryDto | null {
    if (!category) return null;

    return {
      id: category.id,
      label: category.label,
      color: category.color,
      icon: category.icon,
    };
  }
}
