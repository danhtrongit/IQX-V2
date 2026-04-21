import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../../common/services/proxy-http.service';
import {
  RedisCacheService,
  CacheType,
} from '../../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class FundamentalService {
  private readonly logger = new Logger(FundamentalService.name);

  constructor(
    private readonly http: ProxyHttpService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getFinancialStatement(symbol: string, section = 'INCOME_STATEMENT') {
    const upper = symbol.toUpperCase();
    const cacheKey = `fundamental:statement:${upper}:${section}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.FINANCIAL,
    );
    if (cached) return cached;

    const data = await this.http.vciIqGet<{ data: unknown }>(
      `/company/${upper}/financial-statement`,
      { section },
    );
    const result = data?.data || null;
    await this.cacheService.set(cacheKey, result, CacheType.FINANCIAL);
    return result;
  }

  async getStatisticsFinancial(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `fundamental:statistics:${upper}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.FINANCIAL,
    );
    if (cached) return cached;

    const data = await this.http.vciIqGet<{ data: unknown }>(
      `/company/${upper}/statistics-financial`,
    );
    const result = data?.data || null;
    await this.cacheService.set(cacheKey, result, CacheType.FINANCIAL);
    return result;
  }

  async getMetricsDictionary(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `fundamental:metrics:${upper}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.STATIC,
    );
    if (cached) return cached;

    const data = await this.http.vciIqGet<{ data: unknown }>(
      `/company/${upper}/financial-statement/metrics`,
    );
    const result = data?.data || null;
    await this.cacheService.set(cacheKey, result, CacheType.STATIC);
    return result;
  }

  async getMasFinancialReport(
    stockCode: string,
    type: string,
    termType: string,
  ) {
    const upper = stockCode.toUpperCase();
    const cacheKey = `fundamental:mas:${upper}:${type}:${termType}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.FINANCIAL,
    );
    if (cached) return cached;

    const query = `query{vsFinancialReportList(StockCode:"${upper}",Type:"${type.toUpperCase()}",TermType:"${termType.toUpperCase()}"){_id,ID,TermCode,YearPeriod,Content{Values{Name,NameEn,Value}}}}`;
    const data = await this.http.masGet<unknown>('/v2/vs/financialReport', {
      query,
    });
    await this.cacheService.set(cacheKey, data, CacheType.FINANCIAL);
    return data;
  }

  async getKbsFinanceInfo(
    symbol: string,
    type: string,
    termtype = 2,
    page = 1,
    pageSize = 4,
  ) {
    const upper = symbol.toUpperCase();
    const cacheKey = `fundamental:kbs:${upper}:${type}:${termtype}:${page}`;
    const cached = await this.cacheService.get<unknown>(
      cacheKey,
      CacheType.FINANCIAL,
    );
    if (cached) return cached;

    const data = await this.http.kbsGet<unknown>(
      `/stock/finance-info/${upper}`,
      {
        page,
        pageSize,
        type: type.toUpperCase(),
        unit: 1000,
        termtype,
        languageid: 1,
      },
    );
    await this.cacheService.set(cacheKey, data, CacheType.FINANCIAL);
    return data;
  }
}
