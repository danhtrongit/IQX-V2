import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService, CacheMetrics, ApiMetrics } from './metrics.service';
import { CacheType } from './redis-cache.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    service.resetMetrics();
  });

  describe('cache metrics', () => {
    it('should record cache hits', () => {
      service.recordCacheHit(CacheType.SEARCH);
      service.recordCacheHit(CacheType.SEARCH);

      const metrics = service.getCacheMetrics(CacheType.SEARCH) as CacheMetrics;
      expect(metrics.hits).toBe(2);
      expect(metrics.hitRate).toBe(100);
    });

    it('should record cache misses', () => {
      service.recordCacheMiss(CacheType.SEARCH);
      service.recordCacheMiss(CacheType.SEARCH);
      service.recordCacheMiss(CacheType.SEARCH);

      const metrics = service.getCacheMetrics(CacheType.SEARCH) as CacheMetrics;
      expect(metrics.misses).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      service.recordCacheHit(CacheType.SEARCH);
      service.recordCacheHit(CacheType.SEARCH);
      service.recordCacheMiss(CacheType.SEARCH);
      service.recordCacheMiss(CacheType.SEARCH);

      const metrics = service.getCacheMetrics(CacheType.SEARCH) as CacheMetrics;
      expect(metrics.hitRate).toBe(50);
    });

    it('should record cache errors', () => {
      service.recordCacheError(CacheType.SEARCH);

      const metrics = service.getCacheMetrics(CacheType.SEARCH) as CacheMetrics;
      expect(metrics.errors).toBe(1);
    });

    it('should return all cache metrics when no type specified', () => {
      service.recordCacheHit(CacheType.SEARCH);
      service.recordCacheHit(CacheType.STATIC);

      const allMetrics = service.getCacheMetrics() as Map<
        CacheType,
        CacheMetrics
      >;
      expect(allMetrics.get(CacheType.SEARCH)?.hits).toBe(1);
      expect(allMetrics.get(CacheType.STATIC)?.hits).toBe(1);
    });
  });

  describe('API metrics', () => {
    it('should record successful API requests', () => {
      service.recordApiRequest('/api/test', 100, true);
      service.recordApiRequest('/api/test', 200, true);

      const metrics = service.getApiMetrics('/api/test') as ApiMetrics;
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should record failed API requests', () => {
      service.recordApiRequest('/api/test', 50, false);
      service.recordApiRequest('/api/test', 80, false);

      const metrics = service.getApiMetrics('/api/test') as ApiMetrics;
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(0);
    });

    it('should calculate average response time', () => {
      service.recordApiRequest('/api/test', 100, true);
      service.recordApiRequest('/api/test', 200, true);

      const metrics = service.getApiMetrics('/api/test') as ApiMetrics;
      expect(metrics.averageResponseTime).toBe(150);
    });

    it('should calculate P95 response time', () => {
      for (let i = 1; i <= 100; i++) {
        service.recordApiRequest('/api/test', i * 10, true);
      }

      const metrics = service.getApiMetrics('/api/test') as ApiMetrics;
      expect(metrics.p95ResponseTime).toBe(960);
    });

    it('should return all API metrics when no endpoint specified', () => {
      service.recordApiRequest('/api/test1', 100, true);
      service.recordApiRequest('/api/test2', 200, true);

      const allMetrics = service.getApiMetrics() as Map<string, ApiMetrics>;
      expect(allMetrics.get('/api/test1')).toBeDefined();
      expect(allMetrics.get('/api/test2')).toBeDefined();
    });
  });

  describe('getAllMetrics', () => {
    it('should return combined cache and API metrics', () => {
      service.recordCacheHit(CacheType.SEARCH);
      service.recordApiRequest('/api/test', 100, true);

      const allMetrics = service.getAllMetrics();
      expect(allMetrics.cache).toBeDefined();
      expect(allMetrics.api).toBeDefined();
      expect(allMetrics.api['/api/test']).toBeDefined();
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', () => {
      service.recordCacheHit(CacheType.SEARCH);
      service.recordCacheMiss(CacheType.STATIC);
      service.recordApiRequest('/api/test', 100, true);

      service.resetMetrics();

      const cacheMetrics = service.getCacheMetrics(
        CacheType.SEARCH,
      ) as CacheMetrics;
      expect(cacheMetrics.hits).toBe(0);
      expect(cacheMetrics.misses).toBe(0);

      const apiMetrics = service.getApiMetrics('/api/test') as ApiMetrics;
      expect(apiMetrics.totalRequests).toBe(0);
    });
  });
});
