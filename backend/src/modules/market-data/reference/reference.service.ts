import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

export interface SearchBarItem {
  id: string;
  name: string;
  floor: string;
  code: string;
  shortName: string;
  organCode: string;
  icbLv1: { code: string; name: string; level: number } | null;
  icbLv2: { code: string; name: string; level: number } | null;
  icbLv3: { code: string; name: string; level: number } | null;
  icbLv4: { code: string; name: string; level: number } | null;
  comTypeCode: string;
  currentPrice: number | null;
  targetPrice: number | null;
}

export interface EventItem {
  ticker: string;
  eventCode: string;
  eventTitleVi: string;
  displayDate1: string;
  displayDate2: string | null;
  category: string;
}

export interface MarketStatusItem {
  market: string;
  type: string;
  status: string;
  time: number;
  lastTradingDate: number;
}

export interface DukascopyInstrument {
  id: number;
  code: string;
  description: string;
  pipValue: number;
  priceScale: number;
  platformGroupId: string;
}

@Injectable()
export class ReferenceService {
  private readonly logger = new Logger(ReferenceService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async searchBar(language = 1): Promise<SearchBarItem[]> {
    const cacheKey = `reference:search-bar:${language}`;
    const cached = await this.cacheService.get<SearchBarItem[]>(
      cacheKey,
      CacheType.LISTING,
    );
    if (cached) return cached;

    const result = await this.http.vciIqGet<{ data: SearchBarItem[] }>(
      '/v2/company/search-bar',
      { language },
    );
    const data = result?.data || [];
    await this.cacheService.set(cacheKey, data, CacheType.LISTING);
    return data;
  }

  async getEvents(params: {
    fromDate: string;
    toDate: string;
    page?: number;
    size?: number;
    eventCode?: string;
  }): Promise<{
    content: EventItem[];
    totalPages?: number;
    totalElements?: number;
  }> {
    const cacheKey = `reference:events:${params.fromDate}:${params.toDate}:${params.page ?? 0}:${params.size ?? 200}`;
    const cached = await this.cacheService.get<{ content: EventItem[] }>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const result = await this.http.vciIqGet<{
      data: {
        content: EventItem[];
        totalPages?: number;
        totalElements?: number;
      };
    }>('/events', {
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page ?? 0,
      size: params.size ?? 200,
      ...(params.eventCode ? { eventCode: params.eventCode } : {}),
    });
    const data = result?.data || { content: [] };
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  async getMarketStatus(): Promise<MarketStatusItem[]> {
    const cacheKey = 'reference:market-status';
    const cached = await this.cacheService.get<MarketStatusItem[]>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const data = await this.http.masGet<MarketStatusItem[]>(
      '/v1/market/marketStatus',
    );
    await this.cacheService.set(cacheKey, data || [], CacheType.TRADING);
    return data || [];
  }

  async getDukascopyInstruments(): Promise<DukascopyInstrument[]> {
    const cacheKey = 'reference:dukascopy-instruments';
    const cached = await this.cacheService.get<DukascopyInstrument[]>(
      cacheKey,
      CacheType.STATIC,
    );
    if (cached) return cached;

    const result = await this.http.dukascopyGet<{
      instruments: DukascopyInstrument[];
    }>('/instruments');
    const data = result?.instruments || [];
    await this.cacheService.set(cacheKey, data, CacheType.STATIC);
    return data;
  }
}
