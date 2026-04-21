import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class FundsService {
  private readonly logger = new Logger(FundsService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async listFunds(params?: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  }) {
    const cacheKey = `funds:list:${params?.page ?? 1}:${params?.pageSize ?? 100}:${params?.sortField}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.LISTING,
    );
    if (cached) return cached;

    const data = await this.http.fmarketPost<unknown>('/res/products/filter', {
      types: ['NEW_FUND', 'TRADING_FUND'],
      issuerIds: [],
      sortOrder: params?.sortOrder ?? 'DESC',
      sortField: params?.sortField ?? 'navTo6Months',
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 100,
      isIpo: false,
      fundAssetTypes: [],
      bondRemainPeriods: [],
      searchField: '',
      isBuyByReward: false,
      thirdAppIds: [],
    });
    await this.cacheService.set(cacheKey, data, CacheType.LISTING);
    return data;
  }

  async getFundDetail(id: number) {
    const cacheKey = `funds:detail:${id}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.LISTING,
    );
    if (cached) return cached;

    const data = await this.http.fmarketGet<unknown>(`/res/products/${id}`);
    await this.cacheService.set(cacheKey, data, CacheType.LISTING);
    return data;
  }

  async getNavHistory(productId: number, toDate?: string) {
    const cacheKey = `funds:nav:${productId}:${toDate || 'latest'}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    // Note: correct URL is /res/product/get-nav-history (not /res/get-nav-history which 404s)
    const data = await this.http.fmarketPost<unknown>(
      '/res/product/get-nav-history',
      {
        isAllData: 1,
        productId,
        fromDate: null,
        toDate: toDate || null,
      },
    );
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }
}
