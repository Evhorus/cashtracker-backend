import { applyDecorators, UseGuards } from '@nestjs/common';
import { CategoryExistsGuard } from '../guard/category-exists.guard';

export function CategoryExists() {
  return applyDecorators(UseGuards(CategoryExistsGuard));
}
