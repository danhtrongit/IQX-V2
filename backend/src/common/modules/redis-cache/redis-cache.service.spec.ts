import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisCacheService, CacheType } from './redis-cache.service';
import { MetricsService } from './metrics.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCacheManager: any;
  let mockMetricsService: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockMetricsService = {
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
      recordCacheError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('get', () => {
    it('should return cached value and record hit on cache hit', async () => {
      const cachedValue = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.get('test-key', CacheType.SEARCH);

      expect(result).toEqual(cachedValue);
      expect(mockMetricsService.recordCacheHit).toHaveBeenCalledWith(
        CacheType.SEARCH,
      );
      expect(mockMetricsService.recordCacheMiss).not.toHaveBeenCalled();
    });

    it('should return null and record miss when cache is empty', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get('test-key', CacheType.SEARCH);

      expect(result).toBeNull();
      expect(mockMetricsService.recordCacheMiss).toHaveBeenCalledWith(
        CacheType.SEARCH,
      );
      expect(mockMetricsService.recordCacheHit).not.toHaveBeenCalled();
    });

    it('should return null and record error on exception', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key', CacheType.SEARCH);

      expect(result).toBeNull();
      expect(mockMetricsService.recordCacheError).toHaveBeenCalledWith(
        CacheType.SEARCH,
      );
    });
  });

  describe('set', () => {
    it('should set cache with correct TTL for REAL_TIME type', async () => {
      await service.set('test-key', { data: 'test' }, CacheType.REAL_TIME);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        30 * 1000,
      );
    });

    it('should set cache with correct TTL for STATIC type', async () => {
      await service.set('test-key', { data: 'test' }, CacheType.STATIC);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        60 * 60 * 1000,
      );
    });

    it('should set cache with correct TTL for SEARCH type', async () => {
      await service.set('test-key', { data: 'test' }, CacheType.SEARCH);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        5 * 60 * 1000,
      );
    });

    it('should record error on exception', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));

      await service.set('test-key', { data: 'test' }, CacheType.SEARCH);

      expect(mockMetricsService.recordCacheError).toHaveBeenCalledWith(
        CacheType.SEARCH,
      );
    });
  });

  describe('del', () => {
    it('should delete cache key', async () => {
      await service.del('test-key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('generateSearchKey', () => {
    it('should generate consistent key from params', () => {
      const params = { q: 'FPT', exchange: 'HOSE', page: 1, limit: 20 };

      const key1 = service.generateSearchKey(params);
      const key2 = service.generateSearchKey(params);

      expect(key1).toBe(key2);
    });

    it('should generate same key regardless of param order', () => {
      const params1 = { q: 'FPT', exchange: 'HOSE' };
      const params2 = { exchange: 'HOSE', q: 'FPT' };

      const key1 = service.generateSearchKey(params1);
      const key2 = service.generateSearchKey(params2);

      expect(key1).toBe(key2);
    });

    it('should include all params in key', () => {
      const params = { q: 'FPT', exchange: 'HOSE', page: 1 };

      const key = service.generateSearchKey(params);

      expect(key).toContain('q=FPT');
      expect(key).toContain('exchange=HOSE');
      expect(key).toContain('page=1');
    });
  });
});
