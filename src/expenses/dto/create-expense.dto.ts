import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
} from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';
import { Currency } from 'src/common/enums/currency.enum';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { MAX_AMOUNT } from 'src/common/constants/amounts';
import { IsCalendarDate } from 'src/common/validators/calendar-date.validators';

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
  @Max(MAX_AMOUNT, { message: ERROR_MESSAGES.AMOUNT_TOO_LARGE })
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  description?: string;

  @IsNotEmpty()
  @IsCalendarDate()
  date: Date;

  /** Optional. `null` (or '') clears it on an update; omitted leaves it
   * unchanged. Ownership is checked in the service. */
  @IsOptional()
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : (value as string | null),
  )
  paymentMethodId?: string | null;
}
