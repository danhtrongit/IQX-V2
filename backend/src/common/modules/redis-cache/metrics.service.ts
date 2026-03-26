import { Injectable, Logger } from '@nestjs/common';
import { CacheType } from './redis-cache.service';

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  responseTimeHistory: number[];
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private readonly cacheMetrics: Map<CacheType, CacheMetrics> = new Map();
  private readonly apiMetrics: Map<string, ApiMetrics> = new Map();
  private readonly maxHistorySize = 1000;

  constructor() {
    Object.values(CacheType).forEach((type) => {
      this.cacheMetrics.set(type, {
        hits: 0,
        misses: 0,
        errors: 0,
        hitRate: 0,
      });
    });
  }

  recordCacheHit(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType)!;
    metrics.hits++;
    this.updateHitRate(cacheType);
  }

  recordCacheMiss(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType)!;
    metrics.misses++;
    this.updateHitRate(cacheType);
  }

  recordCacheError(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType)!;
    metrics.errors++;
  }

  private updateHitRate(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType)!;
    const total = metrics.hits + metrics.misses;
    metrics.hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;
  }

  recordApiRequest(
    endpoint: string,
    responseTime: number,
    success: boolean,
  ): void {
    let metrics = this.apiMetrics.get(endpoint);
    if (!metrics) {
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        responseTimeHistory: [],
      };
      this.apiMetrics.set(endpoint, metrics);
    }

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    metrics.responseTimeHistory.push(responseTime);
    if (metrics.responseTimeHistory.length > this.maxHistorySize) {
      metrics.responseTimeHistory.shift();
    }

    metrics.averageResponseTime =
      metrics.responseTimeHistory.reduce((a, b) => a + b, 0) /
      metrics.responseTimeHistory.length;

    const sorted = [...metrics.responseTimeHistory].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    metrics.p95ResponseTime = sorted[p95Index] || 0;
  }

  getCacheMetrics(
    cacheType?: CacheType,
  ): CacheMetrics | Map<CacheType, CacheMetrics> {
    if (cacheType) {
      return (
        this.cacheMetrics.get(cacheType) || {
          hits: 0,
          misses: 0,
          errors: 0,
          hitRate: 0,
        }
      );
    }
    return this.cacheMetrics;
  }

  getApiMetrics(endpoint?: string): ApiMetrics | Map<string, ApiMetrics> {
    if (endpoint) {
      return (
        this.apiMetrics.get(endpoint) || {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          responseTimeHistory: [],
        }
      );
    }
    return this.apiMetrics;
  }

  getAllMetrics(): {
    cache: Record<string, CacheMetrics>;
    api: Record<string, Omit<ApiMetrics, 'responseTimeHistory'>>;
  } {
    const cache: Record<string, CacheMetrics> = {};
    this.cacheMetrics.forEach((value, key) => {
      cache[key] = { ...value };
    });

    const api: Record<string, Omit<ApiMetrics, 'responseTimeHistory'>> = {};
    this.apiMetrics.forEach((value, key) => {
      const { responseTimeHistory: _, ...rest } = value;
      api[key] = rest;
    });

    return { cache, api };
  }

  resetMetrics(): void {
    this.cacheMetrics.forEach((metrics) => {
      metrics.hits = 0;
      metrics.misses = 0;
      metrics.errors = 0;
      metrics.hitRate = 0;
    });
    this.apiMetrics.clear();
  }
}
