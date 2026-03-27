import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { MetricsService } from './metrics.service';

export enum CacheType {
  REAL_TIME = 'real_time',
  STATIC = 'static',
  SEARCH = 'search',
  AI_INSIGHT = 'ai_insight',
  AI_NEWS = 'ai_news',
  FINANCIAL = 'financial',
  LISTING = 'listing',
  COMPANY = 'company',
}

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  private readonly TTL_MS = {
    [CacheType.REAL_TIME]: 30 * 1000,
    [CacheType.STATIC]: 60 * 60 * 1000,
    [CacheType.SEARCH]: 5 * 60 * 1000,
    [CacheType.AI_INSIGHT]: 60 * 60 * 1000,
    [CacheType.AI_NEWS]: 5 * 60 * 1000,
    [CacheType.FINANCIAL]: 15 * 60 * 1000,
    [CacheType.LISTING]: 60 * 60 * 1000,
    [CacheType.COMPANY]: 60 * 60 * 1000,
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private metricsService: MetricsService,
  ) {}

  async get<T>(
    key: string,
    cacheType?: CacheType,
  ): Promise<T | null> {
    const start = Date.now();
    const type = cacheType || CacheType.SEARCH;
    try {
      const cached = await this.cacheManager.get<T>(key);
      const duration = Date.now() - start;

      if (cached !== null && cached !== undefined) {
        this.metricsService.recordCacheHit(type);
        this.logger.debug(`Cache HIT for key: ${key} (${duration}ms)`);
      } else {
        this.metricsService.recordCacheMiss(type);
        this.logger.debug(`Cache MISS for key: ${key} (${duration}ms)`);
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}: ${error.message}`);
      this.metricsService.recordCacheError(type);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    cacheType: CacheType = CacheType.SEARCH,
  ): Promise<void> {
    const ttl = this.TTL_MS[cacheType];
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET for key: ${key} with TTL: ${ttl}ms`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}: ${error.message}`);
      this.metricsService.recordCacheError(cacheType);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}: ${error.message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      const store = (this.cacheManager as any).store;
      if (store.client && store.client.keys) {
        const keys = await store.client.keys(pattern);
        if (keys.length > 0) {
          await store.client.del(...keys);
          this.logger.debug(
            `Cache DEL by pattern: ${pattern}, deleted ${keys.length} keys`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Cache DEL by pattern error ${pattern}: ${error.message}`,
      );
    }
  }

  generateSearchKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `search:${sorted}`;
  }
}
