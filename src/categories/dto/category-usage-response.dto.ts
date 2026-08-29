/**
 * How many envelopes a user has in one category.
 *
 * Only categories actually in use appear - a category with no envelopes
 * is absent rather than reported as zero, so callers should treat a
 * missing entry as zero.
 */
export class CategoryUsageDto {
  categoryId: string;
  envelopeCount: number;
}
