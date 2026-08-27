import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeString } from 'src/common/utils/string-utils';
import { ICON_KEYS } from '../constants/icon-keys';
import type { IconKey } from '../constants/icon-keys';
import { PRESET_COLORS } from '../constants/preset-colors';
import type { PresetColor } from '../constants/preset-colors';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => normalizeString(value))
  label: string;

  @IsIn(PRESET_COLORS)
  color: PresetColor;

  @IsIn(ICON_KEYS)
  icon: IconKey;
}
