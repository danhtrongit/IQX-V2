import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(
    private http: ProxyHttpService,
    private cacheService: RedisCacheService,
  ) {}

  async getReport(
    symbol: string,
    type: string,
    termType: number,
    page = 1,
    pageSize = 4,
  ) {
    const upper = symbol.toUpperCase();
    const cacheKey = `financial:report:${upper}:${type}:${termType}:${page}:${pageSize}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.FINANCIAL);
      if (cached) {
        this.logger.debug(`Cache HIT for financial report: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getReportFromKbs(upper, type, termType, page, pageSize),
      () => this.getReportFromVci(upper, termType === 2 ? 'Q' : 'Y'),
      'financial.getReport',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.FINANCIAL);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getRatios(symbol: string, period: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `financial:ratios:${upper}:${period}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.FINANCIAL);
      if (cached) {
        this.logger.debug(`Cache HIT for financial ratios: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `fragment Ratios on CompanyFinancialRatio {
  ticker yearReport lengthReport updateDate
  revenue revenueGrowth netProfit netProfitGrowth
  roe roa pe pb eps currentRatio grossMargin netProfitMargin
  BSA1 BSA2 ISA1 ISA2 CFA1 CFA2
  __typename
}
query Query($ticker: String!, $period: String!) {
  CompanyFinancialRatio(ticker: $ticker, period: $period) {
    ratio { ...Ratios __typename }
    period
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: upper,
      period: period.toUpperCase(),
    });

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.CompanyFinancialRatio || null,
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.FINANCIAL);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getFieldMapping() {
    const cacheKey = 'financial:field-mapping';

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.STATIC);
      if (cached) {
        this.logger.debug(`Cache HIT for field mapping`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `query Query {
  ListFinancialRatio {
    id type name unit isDefault fieldName en_Type en_Name tagName comTypeCode order __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.ListFinancialRatio || [],
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.STATIC);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  private async getReportFromKbs(
    symbol: string,
    type: string,
    termType: number,
    page: number,
    pageSize: number,
  ) {
    const isLCTT = type.toUpperCase() === 'LCTT';
    const params: Record<string, any> = {
      page,
      pageSize,
      type: type.toUpperCase(),
      unit: 1000,
      languageid: 1,
    };

    if (isLCTT) {
      params.termType = termType;
      params.code = symbol.toUpperCase();
    } else {
      params.termtype = termType;
    }

    return this.http.kbsSasGet<any>(
      `/stock/finance-info/${symbol.toUpperCase()}`,
      params,
    );
  }

  private async getReportFromVci(symbol: string, period: string) {
    return this.getRatios(symbol, period).then((r) => r.data);
  }
}