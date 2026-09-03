import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { normalizeName, normalizeString } from 'src/common/utils/string-utils';
import { Currency } from 'src/common/enums/currency.enum';

export class CreateEnvelopeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeName(value))
  name: string;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount?: number | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  description?: string;

  /**
   * A category id, not a label - `envelope.category` used to be free
   * text, which meant renaming a category silently detached every
   * envelope using it (see migration 1787950000000). `null` explicitly
   * clears it; omitted leaves it unchanged on an update.
   *
   * Ownership is checked in the service, not here: a well-formed uuid
   * belonging to somebody else must be rejected, and a DTO can't see who
   * is asking.
   */
  @IsOptional()
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : (value as string | null),
  )
  categoryId?: string | null;
}
