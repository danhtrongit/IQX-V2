import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';
import { MetricsService } from '../../common/modules/redis-cache/metrics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StocksService', () => {
  let service: StocksService;
  let prismaService: any;
  let cacheService: any;
  let metricsService: any;

  const mockStocks = [
    {
      symbol: 'FPT',
      name: 'FPT Corporation',
      nameEn: 'FPT Corporation',
      exchange: 'HOSE',
      type: 'stock',
      sectorCode: 'TECH',
      sectorName: 'Công nghệ',
      icbCode3: 'IC3',
      icbName3: 'Technology',
      enIcbName3: 'Technology',
      comTypeCode: 'CT1',
    },
    {
      symbol: 'FPTI',
      name: 'FPT IS',
      nameEn: 'FPT Information System',
      exchange: 'HOSE',
      type: 'stock',
      sectorCode: 'TECH',
      sectorName: 'Công nghệ',
      icbCode3: 'IC3',
      icbName3: 'Technology',
      enIcbName3: 'Technology',
      comTypeCode: 'CT1',
    },
    {
      symbol: 'VCB',
      name: 'Vietcombank',
      nameEn: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam',
      exchange: 'HOSE',
      type: 'stock',
      sectorCode: 'BANK',
      sectorName: 'Ngân hàng',
      icbCode3: 'ICB1',
      icbName3: 'Banks',
      enIcbName3: 'Banks',
      comTypeCode: 'CT2',
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      sector: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
      generateSearchKey: jest.fn().mockReturnValue('search:test'),
    };

    const mockMetricsService = {
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
      recordCacheError: jest.fn(),
      recordApiRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisCacheService, useValue: mockCacheService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(RedisCacheService);
    metricsService = module.get(MetricsService);
  });

  describe('search', () => {
    it('should return cached results on cache hit', async () => {
      const cachedResponse = {
        message: 'Success',
        data: [mockStocks[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      cacheService.get.mockResolvedValue(cachedResponse);
      cacheService.generateSearchKey.mockReturnValue('search:q=FPT');

      const result = await service.search('FPT');

      expect(result).toEqual(cachedResponse);
      expect(cacheService.get).toHaveBeenCalledWith('search:q=FPT');
      expect(metricsService.recordApiRequest).toHaveBeenCalledWith(
        '/stocks/search',
        expect.any(Number),
        true,
      );
      expect(prismaService.stock.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database on cache miss', async () => {
      cacheService.get.mockImplementation(async () => {
        return null;
      });
      cacheService.generateSearchKey.mockReturnValue('search:q=FPT');
      prismaService.stock.findMany.mockResolvedValue([mockStocks[0]]);
      prismaService.stock.count.mockResolvedValue(1);

      const result = await service.search('FPT');

      expect(prismaService.stock.findMany).toHaveBeenCalled();
      expect(prismaService.stock.count).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should prioritize exact symbol matches', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue('search:q=FPT');
      prismaService.stock.findMany.mockResolvedValue([
        mockStocks[1],
        mockStocks[0],
      ]);
      prismaService.stock.count.mockResolvedValue(2);

      const result = await service.search('FPT');

      const data = result.data as any[];
      expect(data[0].symbol).toBe('FPT');
      expect(data[1].symbol).toBe('FPTI');
      expect(data[0].matchPriority).toBe(1);
      expect(data[1].matchPriority).toBe(2);
    });

    it('should prioritize symbol prefix matches over name matches', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue('search:q=FP');
      prismaService.stock.findMany.mockResolvedValue([
        { ...mockStocks[0], name: 'Something with FP in name' },
        mockStocks[1],
      ]);
      prismaService.stock.count.mockResolvedValue(2);

      const result = await service.search('FP');

      const data = result.data as any[];
      expect(data[0].matchPriority).toBe(2);
      expect(data[1].matchPriority).toBe(2);
    });

    it('should filter by exchange when provided', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue('search:q=&exchange=HOSE');
      prismaService.stock.findMany.mockResolvedValue([mockStocks[0]]);
      prismaService.stock.count.mockResolvedValue(1);

      await service.search(undefined, 'HOSE');

      expect(prismaService.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ exchange: 'HOSE' }),
        }),
      );
    });

    it('should filter by sectorCode when provided', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue(
        'search:q=&sectorCode=TECH',
      );
      prismaService.stock.findMany.mockResolvedValue([mockStocks[0]]);
      prismaService.stock.count.mockResolvedValue(1);

      await service.search(undefined, undefined, 'TECH');

      expect(prismaService.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sectorCode: 'TECH' }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue(
        'search:q=&page=2&limit=10',
      );
      prismaService.stock.findMany.mockResolvedValue([mockStocks[0]]);
      prismaService.stock.count.mockResolvedValue(25);

      const result = await service.search(
        undefined,
        undefined,
        undefined,
        undefined,
        2,
        10,
      );

      expect(prismaService.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe('findBySymbol', () => {
    it('should return cached stock details on cache hit', async () => {
      const cachedStock = { message: 'Success', data: mockStocks[0] };
      cacheService.get.mockResolvedValue(cachedStock);

      const result = await service.findBySymbol('FPT');

      expect(result).toEqual(cachedStock);
      expect(cacheService.get).toHaveBeenCalledWith('stock:FPT');
      expect(prismaService.stock.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database on cache miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.stock.findUnique.mockResolvedValue(mockStocks[0]);

      const result = await service.findBySymbol('FPT');

      expect(prismaService.stock.findUnique).toHaveBeenCalledWith({
        where: { symbol: 'FPT' },
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'stock:FPT',
        expect.objectContaining({ data: mockStocks[0] }),
        CacheType.STATIC,
      );
    });

    it('should return not found message when stock does not exist', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.stock.findUnique.mockResolvedValue(null);

      const result = await service.findBySymbol('INVALID');

      expect(result).toEqual({
        message: 'Không tìm thấy mã chứng khoán',
        data: null,
      });
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should normalize symbol to uppercase', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.stock.findUnique.mockResolvedValue(mockStocks[0]);

      await service.findBySymbol('fpt');

      expect(prismaService.stock.findUnique).toHaveBeenCalledWith({
        where: { symbol: 'FPT' },
      });
    });
  });

  describe('getStats', () => {
    it('should return cached stats on cache hit', async () => {
      const cachedStats = {
        message: 'Success',
        data: { total: 100, byExchange: [], sectors: [] },
      };
      cacheService.get.mockResolvedValue(cachedStats);

      const result = await service.getStats();

      expect(result).toEqual(cachedStats);
      expect(cacheService.get).toHaveBeenCalledWith('stocks:stats');
      expect(prismaService.stock.count).not.toHaveBeenCalled();
    });

    it('should fetch from database on cache miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.stock.count.mockResolvedValue(100);
      prismaService.stock.groupBy.mockResolvedValue([
        { exchange: 'HOSE', _count: { id: 50 } },
        { exchange: 'HNX', _count: { id: 30 } },
      ]);
      prismaService.sector.findMany.mockResolvedValue([
        { id: 1, code: 'TECH', name: 'Technology' },
      ]);

      const result = await service.getStats();

      expect(prismaService.stock.count).toHaveBeenCalled();
      expect(prismaService.stock.groupBy).toHaveBeenCalledWith({
        by: ['exchange'],
        _count: true,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('invalidateStockCache', () => {
    it('should invalidate specific stock cache when symbol provided', async () => {
      await service.invalidateStockCache('FPT');

      expect(cacheService.del).toHaveBeenCalledWith('stock:FPT');
      expect(cacheService.delByPattern).toHaveBeenCalledWith('search:*');
      expect(cacheService.del).toHaveBeenCalledWith('stocks:stats');
    });

    it('should not call del for specific stock when no symbol provided', async () => {
      await service.invalidateStockCache();

      expect(cacheService.del).toHaveBeenCalledTimes(1);
      expect(cacheService.delByPattern).toHaveBeenCalledWith('search:*');
      expect(cacheService.del).toHaveBeenCalledWith('stocks:stats');
    });
  });

  describe('search priority algorithm', () => {
    it('should sort by priority then alphabetically by symbol', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.generateSearchKey.mockReturnValue('search:q=VP');
      const mockData = [
        { ...mockStocks[0], symbol: 'VPB', name: 'VPBank' },
        { ...mockStocks[1], symbol: 'VPS', name: 'VP Securities' },
        { ...mockStocks[2], symbol: 'VCI', name: 'VCI' },
      ];
      prismaService.stock.findMany.mockResolvedValue(mockData);
      prismaService.stock.count.mockResolvedValue(3);

      const result = await service.search('VP');

      const data = result.data as any[];
      expect(data[0].symbol).toBe('VPB');
      expect(data[1].symbol).toBe('VPS');
      expect(data[2].symbol).toBe('VCI');
    });
  });
});
