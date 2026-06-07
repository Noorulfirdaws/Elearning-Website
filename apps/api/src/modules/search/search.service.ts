import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MeiliSearch from 'meilisearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;

  constructor(private config: ConfigService) {
    this.client = new MeiliSearch({
      host: this.config.get('app.meilisearch.host') || 'http://localhost:7700',
      apiKey: this.config.get('app.meilisearch.apiKey'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.createIndex('courses', { primaryKey: 'id' });
      await this.client.index('courses').updateSettings({
        searchableAttributes: ['title', 'description', 'tags', 'instructorName', 'categoryName'],
        filterableAttributes: ['status', 'level', 'categoryId', 'isFree', 'price'],
        sortableAttributes: ['createdAt', 'totalStudents', 'rating', 'price'],
      });
    } catch {
      // Index may already exist
    }
  }

  async indexCourse(course: {
    id: string; title: string; slug: string; description?: string;
    tags: string[]; level: string; price: number; isFree: boolean;
    status: string; categoryId?: string; categoryName?: string;
    instructorName: string; thumbnail?: string;
    totalStudents: number; rating: number; createdAt: Date;
  }) {
    await this.client.index('courses').addDocuments([{
      ...course,
      createdAt: course.createdAt.getTime(),
    }]);
  }

  async searchCourses(query: string, filters?: {
    level?: string; categoryId?: string; isFree?: boolean;
    minPrice?: number; maxPrice?: number; sortBy?: string;
    page?: number; limit?: number;
  }) {
    const { level, categoryId, isFree, minPrice, maxPrice, sortBy, page = 1, limit = 20 } = filters || {};

    const filterParts: string[] = ['status = PUBLISHED'];
    if (level) filterParts.push(`level = ${level}`);
    if (categoryId) filterParts.push(`categoryId = ${categoryId}`);
    if (isFree !== undefined) filterParts.push(`isFree = ${isFree}`);
    if (minPrice !== undefined) filterParts.push(`price >= ${minPrice}`);
    if (maxPrice !== undefined) filterParts.push(`price <= ${maxPrice}`);

    const sortOptions: string[] = [];
    if (sortBy === 'newest') sortOptions.push('createdAt:desc');
    else if (sortBy === 'popular') sortOptions.push('totalStudents:desc');
    else if (sortBy === 'rating') sortOptions.push('rating:desc');
    else if (sortBy === 'price_asc') sortOptions.push('price:asc');
    else if (sortBy === 'price_desc') sortOptions.push('price:desc');

    const result = await this.client.index('courses').search(query || '', {
      filter: filterParts.join(' AND '),
      sort: sortOptions,
      offset: (page - 1) * limit,
      limit,
      attributesToHighlight: ['title', 'description'],
    });

    return {
      hits: result.hits,
      total: result.estimatedTotalHits,
      page,
      limit,
      pages: Math.ceil((result.estimatedTotalHits || 0) / limit),
    };
  }

  async deleteCourse(id: string) {
    await this.client.index('courses').deleteDocument(id);
  }

  async clearAll() {
    await this.client.index('courses').deleteAllDocuments();
  }
}
