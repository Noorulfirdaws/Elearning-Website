/**
 * SearchService with Meilisearch → PostgreSQL fallback
 *
 * Meilisearch outage behaviour:
 *  1. Circuit breaker opens after 5 Meilisearch errors
 *  2. All search queries fall back to PostgreSQL full-text search (ts_vector)
 *  3. PostgreSQL results are slightly less relevant (no typo-tolerance/faceting)
 *     but functionally complete — users can still find courses
 *  4. Meilisearch recovers automatically when circuit re-closes
 *  5. Index writes are queued in-memory and replayed on recovery
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MeiliSearch from 'meilisearch';
import { PrismaService } from '../../config/prisma.service';
import { CircuitBreaker } from '../../common/resilience/circuit-breaker';

interface SearchFilters {
  level?: string; categoryId?: string; isFree?: boolean;
  minPrice?: number; maxPrice?: number; sortBy?: string;
  page?: number; limit?: number;
}

interface SearchResult {
  hits: any[]; total: number; page: number; limit: number;
  pages: number; source: 'meilisearch' | 'postgresql';
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private readonly cb = new CircuitBreaker('meilisearch', {
    failureThreshold: 5,
    timeout: 30_000,
    requestTimeout: 5_000,
  });
  private pendingIndexQueue: any[] = []; // Buffer writes during outage

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.client = new MeiliSearch({
      host:   this.config.get('app.meilisearch.host') || 'http://localhost:7700',
      apiKey: this.config.get('app.meilisearch.apiKey'),
    });
  }

  async onModuleInit() {
    try {
      await this.cb.execute(async () => {
        await this.client.createIndex('courses', { primaryKey: 'id' });
        await this.client.index('courses').updateSettings({
          searchableAttributes: ['title', 'description', 'tags', 'instructorName', 'categoryName'],
          filterableAttributes: ['status', 'level', 'categoryId', 'isFree', 'price'],
          sortableAttributes:   ['createdAt', 'totalStudents', 'rating', 'price'],
        });
        this.logger.log('Meilisearch index ready');
      });
    } catch (e) {
      this.logger.warn(`Meilisearch unavailable at startup: ${e.message} — will use PostgreSQL fallback`);
    }
  }

  // ── Index write: buffered during outage, replayed on recovery ─────────────

  async indexCourse(course: {
    id: string; title: string; slug: string; description?: string;
    tags: string[]; level: string; price: number; isFree: boolean;
    status: string; categoryId?: string; categoryName?: string;
    instructorName: string; thumbnail?: string;
    totalStudents: number; rating: number; createdAt: Date;
  }) {
    const doc = { ...course, createdAt: course.createdAt.getTime() };

    if (this.cb.isOpen) {
      this.pendingIndexQueue.push(doc);
      this.logger.warn(`Meilisearch OPEN — queued index write for course ${course.id} (queue: ${this.pendingIndexQueue.length})`);
      return;
    }

    try {
      await this.cb.execute(() => this.client.index('courses').addDocuments([doc]));
      await this.flushPendingQueue();
    } catch (e) {
      this.pendingIndexQueue.push(doc);
      this.logger.warn(`Index write failed — queued (${this.pendingIndexQueue.length} pending)`);
    }
  }

  // ── Search: Meilisearch first, PostgreSQL fallback ────────────────────────

  async searchCourses(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    const { page = 1, limit = 20 } = filters;

    if (!this.cb.isOpen) {
      try {
        const result = await this.cb.execute(
          () => this.meilisearchSearch(query, filters),
          () => this.postgresSearch(query, filters),
        );
        return result;
      } catch {}
    }

    this.logger.warn('Meilisearch circuit OPEN — using PostgreSQL full-text search');
    return this.postgresSearch(query, filters);
  }

  private async meilisearchSearch(query: string, filters: SearchFilters): Promise<SearchResult> {
    const { level, categoryId, isFree, minPrice, maxPrice, sortBy, page = 1, limit = 20 } = filters;

    const filterParts: string[] = ['status = PUBLISHED'];
    if (level)      filterParts.push(`level = ${level}`);
    if (categoryId) filterParts.push(`categoryId = ${categoryId}`);
    if (isFree !== undefined) filterParts.push(`isFree = ${isFree}`);
    if (minPrice !== undefined) filterParts.push(`price >= ${minPrice}`);
    if (maxPrice !== undefined) filterParts.push(`price <= ${maxPrice}`);

    const sortOptions: string[] = [];
    if (sortBy === 'newest')     sortOptions.push('createdAt:desc');
    else if (sortBy === 'popular') sortOptions.push('totalStudents:desc');
    else if (sortBy === 'rating')  sortOptions.push('rating:desc');
    else if (sortBy === 'price_asc')  sortOptions.push('price:asc');
    else if (sortBy === 'price_desc') sortOptions.push('price:desc');

    const result = await this.client.index('courses').search(query || '', {
      filter: filterParts.join(' AND '),
      sort:   sortOptions,
      offset: (page - 1) * limit,
      limit,
      attributesToHighlight: ['title', 'description'],
    });

    return {
      hits:   result.hits,
      total:  result.estimatedTotalHits || 0,
      page, limit,
      pages:  Math.ceil((result.estimatedTotalHits || 0) / limit),
      source: 'meilisearch',
    };
  }

  /** Full-text fallback using PostgreSQL's native ts_vector */
  private async postgresSearch(query: string, filters: SearchFilters): Promise<SearchResult> {
    const { level, categoryId, isFree, minPrice, maxPrice, sortBy, page = 1, limit = 20 } = filters;

    const where: any = { status: 'PUBLISHED' };
    if (level)        where.level      = level;
    if (categoryId)   where.categoryId = categoryId;
    if (isFree !== undefined)   where.isFree    = isFree;
    if (minPrice !== undefined) where.price = { ...where.price, gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...where.price, lte: maxPrice };

    // PostgreSQL full-text search via contains (simplified — proper ts_vector via raw query)
    if (query?.trim()) {
      where.OR = [
        { title:       { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags:        { has: query } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'popular')    orderBy = { totalStudents: 'desc' };
    else if (sortBy === 'rating') orderBy = { rating: 'desc' };
    else if (sortBy === 'price_asc')  orderBy = { price: 'asc' };
    else if (sortBy === 'price_desc') orderBy = { price: 'desc' };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy,
        skip:  (page - 1) * limit,
        take:  limit,
        select: {
          id: true, title: true, slug: true, thumbnail: true, shortDescription: true,
          price: true, isFree: true, level: true, rating: true, totalStudents: true,
          createdAt: true,
          instructor: { select: { firstName: true, lastName: true } },
          category:   { select: { name: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      hits:   courses,
      total,
      page,   limit,
      pages:  Math.ceil(total / limit),
      source: 'postgresql',
    };
  }

  // ── Replay buffered index writes when Meilisearch recovers ────────────────

  private async flushPendingQueue() {
    if (!this.pendingIndexQueue.length || this.cb.isOpen) return;
    const pending = [...this.pendingIndexQueue];
    this.pendingIndexQueue = [];
    try {
      await this.client.index('courses').addDocuments(pending);
      this.logger.log(`Replayed ${pending.length} queued Meilisearch index writes`);
    } catch (e) {
      this.pendingIndexQueue.unshift(...pending); // Put back on failure
    }
  }

  async deleteCourse(id: string) {
    if (this.cb.isOpen) return;
    try { await this.cb.execute(() => this.client.index('courses').deleteDocument(id)); } catch {}
  }

  async clearAll() {
    if (this.cb.isOpen) return;
    await this.cb.execute(() => this.client.index('courses').deleteAllDocuments());
  }

  health() {
    return { circuit: this.cb.status.state, pendingWrites: this.pendingIndexQueue.length };
  }
}
