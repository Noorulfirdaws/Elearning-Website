import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('courses')
  searchCourses(
    @Query('q') query: string,
    @Query('level') level: string,
    @Query('categoryId') categoryId: string,
    @Query('isFree') isFree: string,
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
    @Query('sortBy') sortBy: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.searchService.searchCourses(query || '', {
      level,
      categoryId,
      isFree: isFree === 'true' ? true : isFree === 'false' ? false : undefined,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      sortBy,
      page: +page || 1,
      limit: +limit || 20,
    });
  }
}
