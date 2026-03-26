import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import {
  KBS_GROUP_MAP,
  KBS_EXCHANGE_MAP,
} from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private http: ProxyHttpService,
    private cacheService: RedisCacheService,
  ) {}

  async getAllSymbols() {
    const cacheKey = 'listing:all-symbols';

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for all symbols`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getSymbolsFromKbs(),
      () => this.getSymbolsFromVci(),
      'listing.getAllSymbols',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getSymbolsByGroup(group: string) {
    const cacheKey = `listing:symbols-by-group:${group}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for symbols by group: ${group}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getSymbolsByGroupFromKbs(group),
      () => this.getSymbolsByGroupFromVci(group),
      'listing.getSymbolsByGroup',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getSectors() {
    const cacheKey = 'listing:sectors';

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for sectors`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.kbsGet<any[]>('/sector/all');

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getStocksBySector(code: number) {
    const cacheKey = `listing:stocks-by-sector:${code}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for stocks by sector: ${code}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const raw = await this.http.kbsGet<any>('/sector/stock', { code, l: 1 });
    const stocks = (raw?.stocks || []).map(
      (s: any) => s.sb || s.SB || s.symbol,
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data: stocks };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getIcbClassification() {
    const cacheKey = 'listing:icb-classification';

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for ICB classification`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `{
  CompaniesListingInfo {
    ticker
    organName
    enOrganName
    icbName3
    enIcbName3
    icbName2
    enIcbName2
    icbName4
    enIcbName4
    comTypeCode
    icbCode1
    icbCode2
    icbCode3
    icbCode4
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.CompaniesListingInfo || [],
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getIcbCodes() {
    const cacheKey = 'listing:icb-codes';

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.LISTING);
      if (cached) {
        this.logger.debug(`Cache HIT for ICB codes`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `query Query {
  ListIcbCode {
    icbCode
    level
    icbName
    enIcbName
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.ListIcbCode || [],
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.LISTING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  private async getSymbolsFromKbs(): Promise<any[]> {
    const raw = await this.http.kbsGet<any[]>('/stock/search/data');
    return raw.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      nameEn: item.nameEn,
      exchange: KBS_EXCHANGE_MAP[item.exchange] || item.exchange,
      type: item.type,
      referencePrice: item.re ? item.re / 1000 : null,
      ceilingPrice: item.ceiling ? item.ceiling / 1000 : null,
      floorPrice: item.floor ? item.floor / 1000 : null,
    }));
  }

  private async getSymbolsByGroupFromKbs(group: string): Promise<string[]> {
    const code = KBS_GROUP_MAP[group] || group;
    const raw = await this.http.kbsGet<any>(`/index/${code}/stocks`);
    return raw?.data || raw || [];
  }

  private async getSymbolsFromVci(): Promise<any[]> {
    const raw = await this.http.vciGet<any[]>('/price/symbols/getAll');
    return raw.map((item) => ({
      symbol: item.symbol,
      name: item.organName,
      nameEn: item.enOrganName,
      exchange: item.board,
      type: item.type?.toLowerCase() || 'stock',
      referencePrice: null,
      ceilingPrice: null,
      floorPrice: null,
    }));
  }

  private async getSymbolsByGroupFromVci(group: string): Promise<string[]> {
    const raw = await this.http.vciGet<any[]>(
      `/price/symbols/getByGroup?group=${group}`,
    );
    return raw.map((item) => item.symbol);
  }
}