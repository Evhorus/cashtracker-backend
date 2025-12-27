import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { NormalizeStringPipe } from '../pipes/normalize-string.pipe';

export class GetExpensesFilterDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener el formato YYYY-MM-DD' },
  )
  startDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener el formato YYYY-MM-DD' },
  )
  endDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => new NormalizeStringPipe().transform(value))
  search?: string;

  // Reserved for future use if Category model is added
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  sort?: 'ASC' | 'DESC';
}
