import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getTopStocks(params: { q: string; size?: number; sort?: string }) {
    const cacheKey = `analysis:top-stocks:${params.q}:${params.size}:${params.sort}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const data = await this.http.vndGet<unknown>('/top_stocks', {
      q: params.q,
      size: params.size ?? 10,
      sort: params.sort,
    });
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  async getForeignFlows(params: {
    q: string;
    sort?: string;
    size?: number;
    fields?: string;
  }) {
    const cacheKey = `analysis:foreigns:${params.q}:${params.sort}:${params.size}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const data = await this.http.vndGet<unknown>('/foreigns', {
      q: params.q,
      sort: params.sort || 'tradingDate~netVal:desc',
      size: params.size ?? 10,
      fields: params.fields || 'code,netVal,tradingDate',
    });
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  async getScreenerCriteria() {
    const cacheKey = 'analysis:screener-criteria';
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.STATIC,
    );
    if (cached) return cached;

    const data = await this.http.vciScreenerGet<unknown>('/screening/criteria');
    await this.cacheService.set(cacheKey, data, CacheType.STATIC);
    return data;
  }

  async screenStocks(body: {
    page?: number;
    pageSize?: number;
    sortFields?: string[];
    sortOrders?: string[];
    filter?: Array<{
      name: string;
      conditionOptions: Array<Record<string, unknown>>;
    }>;
  }) {
    const data = await this.http.vciScreenerPost<unknown>('/screening/paging', {
      page: body.page ?? 0,
      pageSize: body.pageSize ?? 20,
      sortFields: body.sortFields ?? [],
      sortOrders: body.sortOrders ?? [],
      filter: body.filter ?? [],
    });
    return data;
  }
}
