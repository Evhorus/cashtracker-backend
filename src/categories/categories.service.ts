import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesRepository } from './repositories/categories.repository';
import { ICON_KEYS } from './constants/icon-keys';
import { PRESET_COLORS } from './constants/preset-colors';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * The curated icon/color whitelist CreateCategoryDto/UpdateCategoryDto
   * already validate against (IsIn(ICON_KEYS)/IsIn(PRESET_COLORS)) -
   * exposed here too so the frontend's create-category form can render
   * the same grid instead of hardcoding its own duplicate copy of these
   * lists that would silently drift out of sync with what the backend
   * actually accepts.
   */
  getOptions() {
    return { icons: ICON_KEYS, colors: PRESET_COLORS };
  }

  /**
   * List everything visible to a user: the 9 predefined categories
   * (global rows, userId NULL - seeded once as data, not per-user - see
   * migration 1787942400000-make-category-userid-nullable) plus whatever
   * they've personally created.
   */
  async findAllForUser(userId: string) {
    return this.categoriesRepository.findVisibleForUser(userId);
  }

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    const existing = await this.categoriesRepository.findVisibleForUserByLabel(
      userId,
      createCategoryDto.label,
    );
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS);
    }

    await this.categoriesRepository.create({
      ...createCategoryDto,
      userId,
    });

    return {
      message: 'Categoría creada',
    };
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.label && updateCategoryDto.label !== category.label) {
      // Only ever reachable via the CategoryExists guard, which already
      // confirmed category.userId === the caller's own id (never a global,
      // NULL-owned row) - safe to treat as non-null here.
      const existing =
        await this.categoriesRepository.findVisibleForUserByLabel(
          category.userId as string,
          updateCategoryDto.label,
        );
      if (existing) {
        throw new ConflictException(ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS);
      }
    }

    await this.categoriesRepository.update(id, updateCategoryDto);
    return {
      message: 'Categoría actualizada',
    };
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    return await this.categoriesRepository.remove(category);
  }
}
