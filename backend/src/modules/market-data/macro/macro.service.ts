import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

export interface MacroDataItem {
  ReportDataID: number;
  TermID: number;
  TermYear: number;
  TernDay: string;
  NormID: number;
  GroupName: string;
  NormGroupID: number;
  NormName: string;
  UnitCode: string;
  CssStyle: string;
  NormTypeID: number;
  FromSource: string;
  NormValue: number | null;
  ReportTime: string;
}

export interface CommodityOhlcvItem {
  time: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

const MACRO_NORM_TYPE_MAP: Record<string, number> = {
  gdp: 43,
  cpi: 52,
  industrial_production: 46,
  export_import: 48,
  retail: 47,
  fdi: 50,
  money_supply: 51,
  fx: 53,
  population: 55,
  interest_rate: 66,
};

@Injectable()
export class MacroService {
  private readonly logger = new Logger(MacroService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getMacroData(params: {
    indicator: string;
    type: number;
    fromYear: number;
    toYear: number;
    from?: number;
    to?: number;
  }): Promise<MacroDataItem[]> {
    const normTypeID =
      MACRO_NORM_TYPE_MAP[params.indicator] ?? Number(params.indicator);
    const cacheKey = `macro:${normTypeID}:${params.type}:${params.fromYear}:${params.toYear}`;
    const cached = await this.cacheService.get<MacroDataItem[]>(
      cacheKey,
      CacheType.FINANCIAL,
    );
    if (cached) return cached;

    const data = await this.http.mbkPost<MacroDataItem[]>({
      type: params.type,
      fromYear: params.fromYear,
      toYear: params.toYear,
      from: params.from ?? 0,
      to: params.to ?? 0,
      normTypeID,
    });
    await this.cacheService.set(cacheKey, data || [], CacheType.FINANCIAL);
    return data || [];
  }

  async getCommodityOhlcv(params: {
    ticker: string;
    interval?: string;
    from?: number;
    to?: number;
  }): Promise<CommodityOhlcvItem[]> {
    const cacheKey = `commodity:${params.ticker}:${params.interval || '1d'}:${params.from}:${params.to}`;
    const cached = await this.cacheService.get<CommodityOhlcvItem[]>(
      cacheKey,
      CacheType.TRADING,
    );
    if (cached) return cached;

    const result = await this.http.simplizeGet<{
      data: Array<
        [
          number,
          number | null,
          number | null,
          number | null,
          number | null,
          number | null,
        ]
      >;
    }>('/historical/prices/ohlcv', {
      ticker: params.ticker,
      interval: params.interval || '1d',
      type: 'commodity',
      from: params.from,
      to: params.to,
    });

    const data: CommodityOhlcvItem[] = (result?.data || []).map((item) => ({
      time: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
    }));
    await this.cacheService.set(cacheKey, data, CacheType.TRADING);
    return data;
  }
}
