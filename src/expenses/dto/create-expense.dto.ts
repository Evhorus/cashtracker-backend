import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { normalizeName, normalizeString } from 'src/common/utils/string-utils';
import { Currency } from 'src/common/enums/currency.enum';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { MAX_AMOUNT } from 'src/common/constants/amounts';
import { IsCalendarDate } from 'src/common/validators/calendar-date.validators';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeName(value))
  name: string;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @Max(MAX_AMOUNT, { message: ERROR_MESSAGES.AMOUNT_TOO_LARGE })
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  description?: string;

  @IsNotEmpty()
  @IsCalendarDate()
  date: Date;
}
