import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CategoryExists } from './decorators/category-exists.decorator';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    const categories = await this.categoriesService.findAllForUser(userId);
    return CategoryResponseDto.fromEntities(categories);
  }

  // Static (same for every user) - registered before the userId-scoped
  // GET routes below would matter if there were a GET(':categoryId'),
  // but there isn't one, so ordering relative to those doesn't actually
  // matter here. Kept next to findAll() anyway since both are read paths.
  @Get('options')
  getOptions() {
    return this.categoriesService.getOptions();
  }

  @Post()
  createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  @CategoryExists()
  @Patch(':categoryId')
  updateCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, updateCategoryDto);
  }

  @CategoryExists()
  @Delete(':categoryId')
  remove(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.categoriesService.remove(categoryId);
  }
}
