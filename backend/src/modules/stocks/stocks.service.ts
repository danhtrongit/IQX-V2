import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';
import { MetricsService } from '../../common/modules/redis-cache/metrics.service';

interface SearchResult {
  symbol: string;
  name: string;
  nameEn: string | null;
  exchange: string;
  type: string;
  sectorCode: string | null;
  sectorName: string | null;
  icbCode3: string | null;
  icbName3: string | null;
  enIcbName3: string | null;
  comTypeCode: string | null;
  matchPriority?: number;
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: RedisCacheService,
    private metricsService: MetricsService,
  ) {}

  async search(
    query?: string,
    exchange?: string,
    sectorCode?: string,
    icbCode?: string,
    page = 1,
    limit = 20,
  ) {
    const startTime = Date.now();
    const cacheKey = this.cacheService.generateSearchKey({
      q: query,
      exchange,
      sectorCode,
      icbCode,
      page,
      limit,
    });

    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.metricsService.recordApiRequest(
          '/stocks/search',
          responseTime,
          true,
        );
        this.logger.debug(`Cache HIT for key: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed, proceeding without cache: ${error.message}`);
    }

    const searchResults = await this.executeOptimizedSearch(
      query,
      exchange,
      sectorCode,
      icbCode,
      page,
      limit,
    );

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: searchResults.items,
      pagination: searchResults.pagination,
    };

    try {
      await this.cacheService.set(cacheKey, response);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    const responseTime = Date.now() - startTime;
    this.metricsService.recordApiRequest('/stocks/search', responseTime, true);

    return response;
  }

  private async executeOptimizedSearch(
    query?: string,
    exchange?: string,
    sectorCode?: string,
    icbCode?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};

    if (query && query.trim()) {
      const normalizedQuery = query.toUpperCase().trim();
      where.OR = [
        { symbol: { equals: normalizedQuery } },
        { symbol: { startsWith: normalizedQuery } },
        { name: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (exchange) {
      where.exchange = exchange.toUpperCase();
    }

    if (sectorCode) {
      where.sectorCode = sectorCode;
    }

    if (icbCode) {
      where.OR = [
        ...(where.OR || []),
        { icbCode1: icbCode },
        { icbCode2: icbCode },
        { icbCode3: icbCode },
        { icbCode4: icbCode },
      ];
    }

    const skip = (page - 1) * limit;

    const queryOptions: any = {
      where,
      select: {
        symbol: true,
        name: true,
        nameEn: true,
        exchange: true,
        type: true,
        sectorCode: true,
        sectorName: true,
        icbCode3: true,
        icbName3: true,
        enIcbName3: true,
        comTypeCode: true,
      },
    };

    // Chỉ tắt pagination Prisma cấp DB khi đang tìm bằng query,
    // để nhường chỗ cho `applyPriority` sắp xếp trọn vẹn matches in-memory trước.
    if (!query || !query.trim()) {
      queryOptions.skip = skip;
      queryOptions.take = limit;
    }

    const [items, total] = await Promise.all([
      this.prisma.stock.findMany(queryOptions),
      this.prisma.stock.count({ where }),
    ]);

    let finalItems: SearchResult[] = items as any;

    if (query && query.trim()) {
      const prioritizedItems = this.applyPriority(items as SearchResult[], query);
      finalItems = prioritizedItems.slice(skip, skip + limit);
    }

    return {
      items: finalItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private applyPriority(items: SearchResult[], query: string): SearchResult[] {
    const normalizedQuery = query.toUpperCase().trim();

    return items
      .map((item) => {
        let priority = 4;

        if (item.symbol === normalizedQuery) {
          priority = 1;
        } else if (item.symbol.startsWith(normalizedQuery)) {
          priority = 2;
        } else if (
          item.name.toUpperCase().includes(normalizedQuery) ||
          (item.nameEn && item.nameEn.toUpperCase().includes(normalizedQuery))
        ) {
          priority = 3;
        }

        return { ...item, matchPriority: priority };
      })
      .sort((a, b) => {
        if (a.matchPriority !== b.matchPriority) {
          return (a.matchPriority || 4) - (b.matchPriority || 4);
        }
        return a.symbol.localeCompare(b.symbol);
      });
  }

  async findBySymbol(symbol: string) {
    const startTime = Date.now();
    const cacheKey = `stock:${symbol.toUpperCase()}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.metricsService.recordApiRequest(
          '/stocks/:symbol',
          responseTime,
          true,
        );
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const stock = await this.prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    const response = !stock
      ? { message: 'Không tìm thấy mã chứng khoán', data: null }
      : { message: MESSAGES.COMMON.SUCCESS, data: stock };

    if (stock) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.STATIC);
      } catch (error) {
        this.logger.warn(`Cache set failed: ${error.message}`);
      }
    }

    const responseTime = Date.now() - startTime;
    this.metricsService.recordApiRequest('/stocks/:symbol', responseTime, true);

    return response;
  }

  async getStats() {
    const startTime = Date.now();
    const cacheKey = 'stocks:stats';

    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.metricsService.recordApiRequest('/stocks/stats', responseTime, true);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const [total, byExchange, bySector] = await Promise.all([
      this.prisma.stock.count(),
      this.prisma.stock.groupBy({ by: ['exchange'], _count: true }),
      this.prisma.sector.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        total,
        byExchange: byExchange.map((e: any) => ({
          exchange: e.exchange,
          count: e._count,
        })),
        sectors: bySector,
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.STATIC);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    const responseTime = Date.now() - startTime;
    this.metricsService.recordApiRequest('/stocks/stats', responseTime, true);

    return response;
  }

  async invalidateStockCache(symbol?: string): Promise<void> {
    try {
      if (symbol) {
        await this.cacheService.del(`stock:${symbol.toUpperCase()}`);
      }
      await this.cacheService.delByPattern('search:*');
      await this.cacheService.del('stocks:stats');
      this.logger.log(
        `Cache invalidated for stock: ${symbol || 'all search/stats'}`,
      );
    } catch (error) {
      this.logger.error(`Cache invalidation failed: ${error.message}`);
    }
  }
}