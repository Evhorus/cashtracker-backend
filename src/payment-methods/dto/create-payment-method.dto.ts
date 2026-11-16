import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';
import {
  PRESET_COLORS,
  type PresetColor,
} from 'src/categories/constants/preset-colors';
import {
  PAYMENT_METHOD_TYPES,
  type PaymentMethodType,
} from '../constants/payment-method-types';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => normalizeString(value))
  name: string;

  @IsIn(PAYMENT_METHOD_TYPES)
  type: PaymentMethodType;

  @IsIn(PRESET_COLORS)
  color: PresetColor;

  /** Ignored (stored as null) unless the type is a credit card. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  cutDay?: number | null;
}
