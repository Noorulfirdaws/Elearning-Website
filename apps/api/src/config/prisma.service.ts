import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Connection pool sizing formula:
//   pool_size = (num_cpu_cores * 2) + num_spinning_disks
//   For 10K concurrent users: 100 connections across 5 pods = 20/pod
const POOL_SIZE     = parseInt(process.env.DB_POOL_SIZE     || '20', 10);
const POOL_TIMEOUT  = parseInt(process.env.DB_POOL_TIMEOUT  || '30', 10); // seconds
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10); // ms

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Embed pool config in DATABASE_URL query params for PgBouncer compatibility
    const url = process.env.DATABASE_URL || '';
    const datasourceUrl = url.includes('connection_limit')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}connection_limit=${POOL_SIZE}&pool_timeout=${POOL_TIMEOUT}`;

    super({
      datasources: { db: { url: datasourceUrl } },
      log:
        process.env.NODE_ENV === 'production'
          ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
          : [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') return;
    const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');
    return Promise.all(models.map((modelKey) => (this as any)[modelKey].deleteMany()));
  }
}
