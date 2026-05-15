import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';
import { Currency } from 'src/common/enums/currency.enum';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeString(value))
  name: string;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  description?: string;

  @IsNotEmpty()
  @IsDateString({}, { message: 'La fecha debe tener el formato YYYY-MM-DD' })
  date: Date;
}
