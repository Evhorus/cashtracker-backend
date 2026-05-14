import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeString(value))
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

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
