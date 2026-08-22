import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';
import { Currency } from 'src/common/enums/currency.enum';

export class CreateEnvelopeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeString(value))
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

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    // Convert empty strings to undefined for optional fields
    if (value === '' || value === null) return undefined;
    return normalizeString(value);
  })
  category?: string;
}
