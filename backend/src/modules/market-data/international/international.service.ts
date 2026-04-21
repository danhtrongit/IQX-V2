import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class InternationalService {
  private readonly logger = new Logger(InternationalService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getDukascopyDailyCandles(symbol: string, side = 'BID') {
    const cacheKey = `intl:dukascopy:daily:${symbol}:${side}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const data = await this.http.dukascopyGet<unknown>(
      `/candles/day/${symbol}/${side.toUpperCase()}`,
    );
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  async getBinanceKlines(params: {
    symbol: string;
    interval?: string;
    limit?: number;
  }) {
    const cacheKey = `intl:binance:klines:${params.symbol}:${params.interval}:${params.limit}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const raw = await this.http.binanceGet<Array<Array<string | number>>>(
      '/uiKlines',
      {
        symbol: params.symbol,
        interval: params.interval ?? '1d',
        limit: params.limit ?? 100,
      },
    );

    const data = (raw || []).map((item) => ({
      openTime: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
      closeTime: item[6],
      quoteVolume: item[7],
      trades: item[8],
    }));
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }

  async getBinanceOrderBook(symbol: string, limit = 20) {
    const data = await this.http.binanceGet<{
      lastUpdateId: number;
      bids: string[][];
      asks: string[][];
    }>('/depth', { symbol, limit });
    return data;
  }

  async getBinanceTicker24h(symbol: string) {
    const data = await this.http.binanceGet<unknown>('/ticker/24hr', {
      symbol,
    });
    return data;
  }
}
