import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import { VCI_IQ_TIMEFRAME_MAP } from '../../common/constants/mappings.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private http: ProxyHttpService,
    private cacheService: RedisCacheService,
  ) {}

  async getProfile(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:profile:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for company profile: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getProfileFromKbs(upper),
      () => this.getProfileFromVci(upper),
      'company.getProfile',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getPriceInfo(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:price-info:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for price info: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `query Query($ticker: String!) {
  TickerPriceInfo(ticker: $ticker) {
    ticker exchange ceilingPrice floorPrice referencePrice matchPrice closePrice
    priceChange percentPriceChange highestPrice lowestPrice totalVolume totalValue
    highestPrice1Year lowestPrice1Year foreignTotalVolume foreignCurrentRoom foreignTotalRoom
    averageMatchVolume2Week
    financialRatio { yearReport lengthReport revenue revenueGrowth netProfit netProfitGrowth roe roa pe pb eps currentRatio grossMargin netProfitMargin }
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: upper,
    });

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.TickerPriceInfo || null,
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getShareholders(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:shareholders:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for shareholders: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getShareholdersFromVci(upper),
      () =>
        this.getProfileFromKbs(upper).then((p: any) => p?.Shareholders || []),
      'company.getShareholders',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getManagers(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:managers:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for managers: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `query Query($ticker: String!) {
  OrganizationManagers(ticker: $ticker) { fullName positionName updateDate percentage quantity __typename }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: upper,
    });

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.OrganizationManagers || [],
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getSubsidiaries(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:subsidiaries:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for subsidiaries: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const query = `query Query($ticker: String!) {
  Subsidiary(ticker: $ticker) { percentage subOrListingInfo { organName enOrganName } __typename }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: upper,
    });

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.Subsidiary || [],
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getEvents(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:events:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for events: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getEventsFromKbs(upper),
      () => this.getEventsFromVci(upper),
      'company.getEvents',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getNews(symbol: string, page = 1, limit = 10) {
    const upper = symbol.toUpperCase();
    const cacheKey = `company:news:${upper}:${page}:${limit}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.COMPANY,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for company news: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const data = await this.http.withFallback(
      () => this.getNewsFromKbs(upper, page, limit),
      () => this.getNewsFromVci(upper),
      'company.getNews',
    );

    const response = { message: MESSAGES.COMMON.SUCCESS, data };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.COMPANY);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getInternalTrading(symbol: string, page = 1, limit = 10) {
    const data = await this.http.kbsGet<any>(
      `/stockinfo/news/internal-trading/${symbol.toUpperCase()}`,
      { l: 1, p: page, s: limit },
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  // ============================================================
  //  VCI IQ Insight — Nước ngoài / Tự doanh / Nội bộ / Cung cầu
  // ============================================================

  /** Nước ngoài — Foreign flow (khớp lệnh + thỏa thuận) */
  async getForeignFlow(
    symbol: string,
    timeFrame = 'D',
    fromDate?: string,
    toDate?: string,
    page = 0,
    size = 50,
  ) {
    const res = await this.fetchIqPriceHistory(
      symbol,
      timeFrame,
      fromDate,
      toDate,
      page,
      size,
    );
    const raw = res?.data || res;
    const items: any[] = raw?.content || [];

    const mapped = items.map((r: any) => ({
      date: r.tradingDate,
      matchBuyVolume: r.foreignBuyVolumeMatched ?? 0,
      matchBuyValue: r.foreignBuyValueMatched ?? 0,
      matchSellVolume: r.foreignSellVolumeMatched ?? 0,
      matchSellValue: r.foreignSellValueMatched ?? 0,
      matchNetVolume:
        (r.foreignBuyVolumeMatched ?? 0) - (r.foreignSellVolumeMatched ?? 0),
      matchNetValue:
        (r.foreignBuyValueMatched ?? 0) - (r.foreignSellValueMatched ?? 0),
      // GD Thỏa thuận
      dealBuyVolume: r.foreignBuyVolumeDeal ?? 0,
      dealBuyValue: r.foreignBuyValueDeal ?? 0,
      dealSellVolume: r.foreignSellVolumeDeal ?? 0,
      dealSellValue: r.foreignSellValueDeal ?? 0,
      dealNetVolume:
        (r.foreignBuyVolumeDeal ?? 0) - (r.foreignSellVolumeDeal ?? 0),
      dealNetValue:
        (r.foreignBuyValueDeal ?? 0) - (r.foreignSellValueDeal ?? 0),
      // Tổng
      totalNetVolume: r.foreignNetVolumeTotal ?? 0,
      totalNetValue: r.foreignNetValueTotal ?? 0,
      // Tỷ lệ sở hữu
      ownedPercentage: r.foreignOwnedPercentage ?? null,
      // Volume phiên
      totalVolume: r.totalVolume ?? 0,
    }));

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: mapped,
      pagination: this.extractPagination(raw),
    };
  }

  /** Tự doanh — Proprietary trading flow */
  async getProprietaryFlow(
    symbol: string,
    timeFrame = 'D',
    fromDate?: string,
    toDate?: string,
    page = 0,
    size = 50,
  ) {
    const tf = VCI_IQ_TIMEFRAME_MAP[timeFrame] || VCI_IQ_TIMEFRAME_MAP.D;

    const params: Record<string, any> = { page, size };
    if (fromDate && toDate) {
      params.fromDate = fromDate;
      params.toDate = toDate;
    } else {
      params.timeFrame = tf;
    }

    const res = await this.http.vciIqGet<any>(
      `/company/${symbol.toUpperCase()}/proprietary-history`,
      params,
    );
    const raw = res?.data || res;
    const items: any[] = raw?.content || [];
    const mapped = items.map((r: any) => ({
      date: r.tradingDate,
      // GD Khớp lệnh
      matchBuyVolume: r.totalMatchBuyTradeVolume ?? 0,
      matchBuyValue: r.totalMatchBuyTradeValue ?? 0,
      matchSellVolume: r.totalMatchSellTradeVolume ?? 0,
      matchSellValue: r.totalMatchSellTradeValue ?? 0,
      matchNetVolume:
        (r.totalMatchBuyTradeVolume ?? 0) - (r.totalMatchSellTradeVolume ?? 0),
      matchNetValue:
        (r.totalMatchBuyTradeValue ?? 0) - (r.totalMatchSellTradeValue ?? 0),
      // GD Thỏa thuận
      dealBuyVolume: r.totalDealBuyTradeVolume ?? 0,
      dealBuyValue: r.totalDealBuyTradeValue ?? 0,
      dealSellVolume: r.totalDealSellTradeVolume ?? 0,
      dealSellValue: r.totalDealSellTradeValue ?? 0,
      dealNetVolume:
        (r.totalDealBuyTradeVolume ?? 0) - (r.totalDealSellTradeVolume ?? 0),
      dealNetValue:
        (r.totalDealBuyTradeValue ?? 0) - (r.totalDealSellTradeValue ?? 0),
      // Tổng ròng
      totalNetVolume: r.totalTradeNetVolume ?? 0,
      totalNetValue: r.totalTradeNetValue ?? 0,
      // Volume phiên
      totalBuyVolume: r.totalBuyTradeVolume ?? 0,
      totalSellVolume: r.totalSellTradeVolume ?? 0,
    }));

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: mapped,
      pagination: this.extractPagination(raw),
    };
  }

  /** Nội bộ — Insider transactions (VCI IQ primary, KBS fallback) */
  async getInsiderTransactions(symbol: string, page = 0, size = 50) {
    const data = await this.http.withFallback(
      () => this.getInsiderFromVciIq(symbol, page, size),
      () => this.getInsiderFromKbs(symbol, page + 1, size),
      'company.getInsiderTransactions',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Cung cầu — Supply/Demand (order book stats) */
  async getSupplyDemand(
    symbol: string,
    timeFrame = 'D',
    fromDate?: string,
    toDate?: string,
    page = 0,
    size = 50,
  ) {
    const res = await this.fetchIqPriceHistory(
      symbol,
      timeFrame,
      fromDate,
      toDate,
      page,
      size,
    );
    const raw = res?.data || res;
    const items: any[] = raw?.content || [];

    const mapped = items.map((r: any) => ({
      date: r.tradingDate,
      // KL chưa khớp
      buyUnmatchedVolume: r.totalBuyUnmatchedVolume ?? 0,
      sellUnmatchedVolume: r.totalSellUnmatchedVolume ?? 0,
      unmatchedDiff:
        (r.totalBuyUnmatchedVolume ?? 0) - (r.totalSellUnmatchedVolume ?? 0),
      // Số lệnh đặt
      buyTradeCount: r.totalBuyTrade ?? 0,
      sellTradeCount: r.totalSellTrade ?? 0,
      // KL đặt lệnh
      buyTradeVolume: r.totalBuyTradeVolume ?? 0,
      sellTradeVolume: r.totalSellTradeVolume ?? 0,
      // KLTB 1 lệnh
      avgBuyTradeVolume: r.averageBuyTradeVolume ?? 0,
      avgSellTradeVolume: r.averageSellTradeVolume ?? 0,
      // Chênh lệch KL đặt Mua – Bán
      tradeVolumeDiff:
        (r.totalBuyTradeVolume ?? 0) - (r.totalSellTradeVolume ?? 0),
      // Volume + giá phiên
      totalVolume: r.totalVolume ?? 0,
      closePrice: r.closePrice ?? 0,
    }));

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: mapped,
      pagination: this.extractPagination(raw),
    };
  }

  // ============================================================
  //  Private — VCI IQ Insight helpers
  // ============================================================

  private async fetchIqPriceHistory(
    symbol: string,
    timeFrame: string,
    fromDate?: string,
    toDate?: string,
    page = 0,
    size = 50,
  ) {
    const tf = VCI_IQ_TIMEFRAME_MAP[timeFrame] || VCI_IQ_TIMEFRAME_MAP.D;
    const params: Record<string, any> = { page, size };
    if (fromDate && toDate) {
      params.fromDate = fromDate;
      params.toDate = toDate;
    } else {
      params.timeFrame = tf;
    }
    return this.http.vciIqGet<any>(
      `/company/${symbol.toUpperCase()}/price-history`,
      params,
    );
  }

  private async getInsiderFromVciIq(
    symbol: string,
    page: number,
    size: number,
  ) {
    const res = await this.http.vciIqGet<any>(
      `/company/${symbol.toUpperCase()}/insider-transaction`,
      { page, size },
    );
    const raw = res?.data || res;
    const items: any[] = raw?.content || [];
    return items.map((r: any) => ({
      name: r.traderNameVi || r.traderNameEn || '',
      position: r.traderPositionVi || r.traderPositionEn || '',
      action: r.actionTypeVi || r.actionTypeEn || '',
      shareRegistered: r.shareRegister ?? 0,
      shareExecuted: r.shareAcquire ?? 0,
      shareBefore: r.shareBeforeTrade ?? 0,
      shareAfter: r.shareAfterTrade ?? 0,
      status: r.tradeStatusVi || r.tradeStatusEn || '',
      startDate: r.startDate || null,
      endDate: r.endDate || null,
      publicDate: r.publicDate || null,
    }));
  }

  private async getInsiderFromKbs(symbol: string, page: number, size: number) {
    return this.http.kbsGet<any>(
      `/stockinfo/news/internal-trading/${symbol.toUpperCase()}`,
      { l: 1, p: page, s: size },
    );
  }

  private extractPagination(raw: any) {
    return {
      page: raw?.number ?? 0,
      size: raw?.size ?? 50,
      totalElements: raw?.totalElements ?? 0,
      totalPages: raw?.totalPages ?? 0,
    };
  }

  // ---------- KBS (existing) ----------

  private async getProfileFromKbs(symbol: string) {
    return this.http.kbsGet<any>(`/stockinfo/profile/${symbol.toUpperCase()}`, {
      l: 1,
    });
  }

  private async getEventsFromKbs(symbol: string) {
    return this.http.kbsGet<any>(`/stockinfo/event/${symbol.toUpperCase()}`, {
      l: 1,
      p: 1,
      s: 20,
    });
  }

  private async getNewsFromKbs(symbol: string, page: number, limit: number) {
    return this.http.kbsGet<any>(`/stockinfo/news/${symbol.toUpperCase()}`, {
      l: 1,
      p: page,
      s: limit,
    });
  }

  // ---------- VCI (existing) ----------

  private async getProfileFromVci(symbol: string) {
    const query = `query Query($ticker: String!) {
  CompanyListingInfo(ticker: $ticker) {
    ticker organName enOrganName organShortName icbName3 enIcbName3 icbName4
    comTypeCode icbCode1 icbCode2 icbCode3 icbCode4 issueShare history companyProfile __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: symbol.toUpperCase(),
    });
    return result?.data?.CompanyListingInfo || null;
  }

  private async getShareholdersFromVci(symbol: string) {
    const query = `query Query($ticker: String!) {
  OrganizationShareHolders(ticker: $ticker) { ownerFullName quantity percentage updateDate __typename }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: symbol.toUpperCase(),
    });
    return result?.data?.OrganizationShareHolders || [];
  }

  private async getEventsFromVci(symbol: string) {
    const query = `query Query($ticker: String!) {
  OrganizationEvents(ticker: $ticker) { eventTitle publicDate issueDate eventListCode ratio value recordDate exrightDate eventListName __typename }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: symbol.toUpperCase(),
    });
    return result?.data?.OrganizationEvents || [];
  }

  private async getNewsFromVci(symbol: string) {
    const query = `query Query($ticker: String!, $langCode: String!) {
  News(ticker: $ticker, langCode: $langCode) { newsTitle newsImageUrl newsSourceLink publicDate newsShortContent __typename }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: symbol.toUpperCase(),
      langCode: 'vi',
    });
    return result?.data?.News || [];
  }
}
