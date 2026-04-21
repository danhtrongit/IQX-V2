import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

export interface MarketRatioItem {
  reportDate: string;
  value: number;
}

export interface PriceHistorySummary {
  averageMatchVolume: number;
  averageMatchValue: number;
  totalMatchVolume: number;
  totalDealVolume: number;
  foreignBuyVolumeTotal: number;
  foreignSellVolumeTotal: number;
}

@Injectable()
export class ValuationService {
  private readonly logger = new Logger(ValuationService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getMarketPE(
    indexCode = 'VNINDEX',
    fromDate?: string,
  ): Promise<MarketRatioItem[]> {
    return this.getMarketRatio('PRICE_TO_EARNINGS', indexCode, fromDate);
  }

  async getMarketPB(
    indexCode = 'VNINDEX',
    fromDate?: string,
  ): Promise<MarketRatioItem[]> {
    return this.getMarketRatio('PRICE_TO_BOOK', indexCode, fromDate);
  }

  async getMarketEvaluation(indexCode = 'VNINDEX', fromDate?: string) {
    const [pe, pb] = await Promise.all([
      this.getMarketPE(indexCode, fromDate),
      this.getMarketPB(indexCode, fromDate),
    ]);

    const pbMap = new Map(pb.map((item) => [item.reportDate, item.value]));
    return pe.map((item) => ({
      reportDate: item.reportDate,
      pe: item.value,
      pb: pbMap.get(item.reportDate) ?? null,
    }));
  }

  async getPriceHistorySummary(
    symbol: string,
    timeFrame = 'ONE_DAY',
  ): Promise<PriceHistorySummary | null> {
    const upper = symbol.toUpperCase();
    const cacheKey = `valuation:price-summary:${upper}:${timeFrame}`;
    const cached = await this.cacheService.get<PriceHistorySummary>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const result = await this.http.vciIqGet<{ data: PriceHistorySummary }>(
      `/company/${upper}/price-history-summary`,
      { timeFrame, page: 0, size: 5 },
    );
    const data = result?.data ?? null;
    if (data) await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  private async getMarketRatio(
    ratioCode: string,
    indexCode: string,
    fromDate?: string,
  ): Promise<MarketRatioItem[]> {
    const cacheKey = `valuation:ratio:${ratioCode}:${indexCode}:${fromDate || 'all'}`;
    const cached = await this.cacheService.get<MarketRatioItem[]>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const q = `ratioCode:${ratioCode}~code:${indexCode}${fromDate ? `~reportDate:gte:${fromDate}` : ''}`;
    const result = await this.http.vndGet<{ data: MarketRatioItem[] }>(
      '/ratios',
      {
        q,
        sort: 'reportDate:desc',
        size: 10000,
        fields: 'value,reportDate',
      },
    );
    const data = result?.data || [];
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }
}
