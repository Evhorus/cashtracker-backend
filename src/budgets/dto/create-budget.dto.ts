import { Optional } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { NormalizeStringPipe } from '../pipes/normalize-string.pipe';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => new NormalizeStringPipe().transform(value))
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => new NormalizeStringPipe().transform(value))
  description?: string;

  @IsString()
  @Optional()
  @Transform(({ value }) => new NormalizeStringPipe().transform(value))
  category?: string;
}
