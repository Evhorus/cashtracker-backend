import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Request } from 'express';
import { CategoriesService } from '../categories.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

@Injectable()
export class CategoryExistsGuard implements CanActivate {
  constructor(private readonly categoriesService: CategoriesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { categoryId } = req.params;
    assertIsUUID(categoryId, 'categoryId');

    const category = await this.categoriesService.findOne(categoryId);

    // Same response for "doesn't exist" and "exists but isn't yours" - a
    // category you don't own must be indistinguishable from one that isn't
    // there, otherwise a caller can enumerate other users' category IDs.
    // Same pattern as EnvelopeExistsGuard.
    if (!category || category.userId !== req.user?.id) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }

    req.category = category;
    return true;
  }
}
