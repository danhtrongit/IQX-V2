import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { DATA_SOURCES } from '../../common/constants/data-sources.constant';
import { KBS_EXCHANGE_MAP } from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';
import { MarketDataGateway } from './market-data.gateway';
import {
  GetAllocatedIcbDetailDto,
  GetAllocatedIcbDto,
} from './dto/get-allocated-icb.dto';
import {
  GetAllSectorSignalsDto,
  GetSectorSignalDto,
} from './dto/get-sector-signal.dto';

interface AllocatedIcbRawItem {
  icb_code: number;
  icbChangePercent: number | string | null;
  totalPriceChange: number | string | null;
  totalMarketCap: number | string | null;
  totalValue: number | string | null;
  totalStockIncrease: number | string | null;
  totalStockDecrease: number | string | null;
  totalStockNoChange: number | string | null;
  icbCodeParent: number | null;
}

interface AllocatedIcbDetailRawStock {
  symbol: string;
  refPrice: number | string | null;
  matchPrice: number | string | null;
  ceilingPrice: number | string | null;
  floorPrice: number | string | null;
  accumulatedVolume: number | string | null;
  accumulatedValue: number | string | null;
  organName: string | null;
  organShortName: string | null;
  enOrganName: string | null;
  enOrganShortName: string | null;
  foreignNetVolume: number | string | null;
  foreignNetValue: number | string | null;
  board: string | null;
}

interface AllocatedIcbDetailRawItem extends AllocatedIcbRawItem {
  icbDataDetail?: AllocatedIcbDetailRawStock[];
}

interface IcbCodeMetadata {
  icbCode: number;
  level: number | null;
  icbName: string | null;
  enIcbName: string | null;
}

interface SectorSignalInputMetrics {
  D: number | null;
  W: number | null;
  M: number | null;
  VD: number | null;
  VW: number | null;
  VM: number | null;
  MDW: number | null;
  MDM: number | null;
  MWM: number | null;
}

interface SectorSignalEvaluation {
  label: string;
  matchedLabels: string[];
  isExactMatch: boolean;
}

interface TradingSessionStats {
  latestTradingDate: string | null;
  tradingDaysInWeek: number;
  tradingDaysInMonth: number;
}

interface SectorSignalItem {
  icbCode: number;
  icbName: string | null;
  enIcbName: string | null;
  icbLevel: number | null;
  icbCodeParent: number | null;
  input: SectorSignalInputMetrics & {
    tradingDaysInWeek: number;
    tradingDaysInMonth: number;
  };
  result: SectorSignalEvaluation;
}

interface SectorSignalSnapshot {
  group: string;
  metadataList: IcbCodeMetadata[];
  metadataMap: Map<number, IcbCodeMetadata>;
  dayMap: Map<number, AllocatedIcbRawItem>;
  weekMap: Map<number, AllocatedIcbRawItem>;
  monthMap: Map<number, AllocatedIcbRawItem>;
  childCodeMap: Map<number, number[]>;
  sessionStats: TradingSessionStats;
  dayResolvedCache: Map<number, AllocatedIcbRawItem | null>;
  weekResolvedCache: Map<number, AllocatedIcbRawItem | null>;
  monthResolvedCache: Map<number, AllocatedIcbRawItem | null>;
}

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const SECTOR_SIGNAL_RULES = [
  {
    label: 'Dẫn sóng',
    condition: 'M > 4% & W >= 2 & D >= 0 & MDM >= 1.2 & MWM >= 1.1',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M > 4 &&
      input.W !== null &&
      input.W >= 2 &&
      input.D !== null &&
      input.D >= 0 &&
      input.MDM !== null &&
      input.MDM >= 1.2 &&
      input.MWM !== null &&
      input.MWM >= 1.1,
  },
  {
    label: 'Hút tiền',
    condition: 'M > -6 & W > -2 & (MDM >= 1.4 or MWM >= 1.2)',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M > -6 &&
      input.W !== null &&
      input.W > -2 &&
      ((input.MDM !== null && input.MDM >= 1.4) ||
        (input.MWM !== null && input.MWM >= 1.2)),
  },
  {
    label: 'Tích lũy',
    condition:
      '-2 <= W <= 2 & -5 <= M <= 5 & -1.5 <= D <= 1.5 & 0.9 <= MDM <= 1.2 & 0.9 <= MWM <= 1.1',
    matches: (input: SectorSignalInputMetrics) =>
      input.W !== null &&
      input.W >= -2 &&
      input.W <= 2 &&
      input.M !== null &&
      input.M >= -5 &&
      input.M <= 5 &&
      input.D !== null &&
      input.D >= -1.5 &&
      input.D <= 1.5 &&
      input.MDM !== null &&
      input.MDM >= 0.9 &&
      input.MDM <= 1.2 &&
      input.MWM !== null &&
      input.MWM >= 0.9 &&
      input.MWM <= 1.1,
  },
  {
    label: 'Phân phối',
    condition: 'M >= 6 & W <= -2 & D <= 0 & (MDM >= 1.2 or MWM >= 1.1)',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M >= 6 &&
      input.W !== null &&
      input.W <= -2 &&
      input.D !== null &&
      input.D <= 0 &&
      ((input.MDM !== null && input.MDM >= 1.2) ||
        (input.MWM !== null && input.MWM >= 1.1)),
  },
  {
    label: 'Hồi kỹ thuật',
    condition: 'M <= -8 & M <= -8 & D > 0 & MDW >= 1.0',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M <= -8 &&
      input.D !== null &&
      input.D > 0 &&
      input.MDW !== null &&
      input.MDW >= 1.0,
  },
  {
    label: 'Suy yếu',
    condition: 'M <= -6 & W <= -3 & MDM < 1.2 & MWM < 1.1',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M <= -6 &&
      input.W !== null &&
      input.W <= -3 &&
      input.MDM !== null &&
      input.MDM < 1.2 &&
      input.MWM !== null &&
      input.MWM < 1.1,
  },
] as const;

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private cachedIndices: any[] = [];

  constructor(
    private http: ProxyHttpService,
    private marketGateway: MarketDataGateway,
    private cacheService: RedisCacheService,
  ) {}

  /** Bảng giá realtime */
  async getPriceBoard(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase());
    const data = await this.http.withFallback(
      () => this.getPriceBoardFromKbs(upper),
      () => this.getPriceBoardFromVci(upper),
      'trading.getPriceBoard',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  async getAllocatedIcb(payload: GetAllocatedIcbDto) {
    const data = await this.http.vciPost<AllocatedIcbRawItem[]>(
      '/market-watch/AllocatedICB/getAllocated',
      payload,
    );

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: (data || []).map((item) => this.mapAllocatedIcbItem(item)),
    };
  }

  async getAllocatedIcbDetail(payload: GetAllocatedIcbDetailDto) {
    const data = await this.http.vciPost<AllocatedIcbDetailRawItem>(
      '/market-watch/AllocatedICB/getAllocatedDetail',
      payload,
    );

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: data ? this.mapAllocatedIcbDetailItem(data) : null,
    };
  }

  async getSectorSignals(payload: GetSectorSignalDto): Promise<any> {
    const group = payload.group.toUpperCase();
    const icbCode = payload.icbCode;
    const cacheKey = this.getSectorSignalCacheKey(group, icbCode);

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.TRADING);
      if (cached) {
        this.logger.debug(`Cache HIT for sector signal: ${group}:${icbCode}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const snapshot = await this.getSectorSignalSnapshot(group);
    const item = this.buildSectorSignalItem(icbCode, snapshot);
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        group,
        icbCode,
        asOfDate: snapshot.sessionStats.latestTradingDate,
        item,
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.TRADING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  async getAllSectorSignals(payload: GetAllSectorSignalsDto): Promise<any> {
    const group = payload.group.toUpperCase();
    const cacheKey = this.getAllSectorSignalsCacheKey(group);

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.TRADING);
      if (cached) {
        this.logger.debug(`Cache HIT for all sector signals: ${group}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    const snapshot = await this.getSectorSignalSnapshot(group);
    const codes = this.getAllSectorSignalCodes(snapshot);
    const items = codes
      .map((icbCode) => this.buildSectorSignalItem(icbCode, snapshot))
      .filter((item): item is SectorSignalItem => item !== null)
      .sort((left, right) => this.compareSectorSignalItems(left, right));
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        group,
        asOfDate: snapshot.sessionStats.latestTradingDate,
        total: items.length,
        items,
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.TRADING);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${error.message}`);
    }

    return response;
  }

  // ---------- KBS ----------

  private async getPriceBoardFromKbs(symbols: string[]) {
    const raw = await this.http.kbsPost<any[]>(
      '/stock/iss',
      { code: symbols.join(',') },
      DATA_SOURCES.KBS.PRICE_BOARD_HEADERS,
    );

    return (raw || []).map((item) => ({
      symbol: item.SB,
      exchange: KBS_EXCHANGE_MAP[item.EX] || item.EX,
      ceilingPrice: item.CL / 1000,
      floorPrice: item.FL / 1000,
      referencePrice: item.RE / 1000,
      openPrice: item.OP / 1000,
      closePrice: item.CP / 1000,
      highestPrice: item.HI / 1000,
      lowestPrice: item.LO / 1000,
      priceChange: item.CH / 1000,
      percentChange: item.CHP,
      totalVolume: item.TT,
      totalValue: item.TV,
      bid: [
        { price: item.B1 / 1000, volume: item.V1 },
        { price: item.B2 / 1000, volume: item.V2 },
        { price: item.B3 / 1000, volume: item.V3 },
      ],
      ask: [
        { price: item.S1 / 1000, volume: item.U1 },
        { price: item.S2 / 1000, volume: item.U2 },
        { price: item.S3 / 1000, volume: item.U3 },
      ],
      foreignBuy: item.FB,
      foreignSell: item.FS,
      foreignRoom: item.FR,
    }));
  }

  // ---------- VCI ----------

  private async getPriceBoardFromVci(symbols: string[]) {
    const raw = await this.http.vciPost<any[]>('/price/symbols/getList', {
      symbols,
    });

    return (raw || []).map((item) => {
      const li = item.listingInfo || {};
      const mp = item.matchPrice || {};
      const ba = item.bidAsk || {};
      const bids = ba.bidPrices || [];
      const asks = ba.askPrices || [];

      return {
        symbol: li.symbol,
        exchange: li.board,
        ceilingPrice: li.ceilingPrice,
        floorPrice: li.floorPrice,
        referencePrice: li.referencePrice,
        openPrice: li.openPrice,
        closePrice: li.closePrice,
        highestPrice: li.highestPrice,
        lowestPrice: li.lowestPrice,
        priceChange: mp.priceChange,
        percentChange: mp.percentPriceChange,
        totalVolume: mp.totalVolume,
        totalValue: mp.totalValue,
        bid: bids.map((b: any) => ({ price: b.price, volume: b.volume })),
        ask: asks.map((a: any) => ({ price: a.price, volume: a.volume })),
        foreignBuy: mp.foreignBuyVolume,
        foreignSell: mp.foreignSellVolume,
        foreignRoom: null,
      };
    });
  }

  // ---------- TỰ ĐỘNG POLLING MARKETS ----------

  @Cron('*/3 * * * * *') // Mỗi 3 giây
  async pollMarketIndices() {
    try {
      // payload map: HOSE -> VNINDEX, 30 -> VN30...
      const codes = 'HOSE,30,HNX,HNX30,UPCOM,100,MID,SML,ALL';
      const raw = await this.http.kbsPost<any[]>(
        '/index',
        { code: codes },
        DATA_SOURCES.KBS.PRICE_BOARD_HEADERS,
      );

      if (raw && raw.length > 0) {
        // Ánh xạ lại về chuẩn hệ thống
        const KBS_CODE_TO_SYMBOL: Record<string, string> = {
          HOSE: 'VNINDEX',
          '30': 'VN30',
          HNX: 'HNX',
          HNX30: 'HNX30',
          UPCOM: 'UPCOM',
          '100': 'VN100',
          MID: 'VNMID',
          SML: 'VNSMALL',
          ALL: 'VNALL',
        };

        // KBS index API uses different field names for code:
        // Try SB (like price board), MC, CD, or fall back to order-based matching
        const codesArr = codes.split(',');

        const result = raw.map((item: any, idx: number) => {
          // Try multiple possible field names for the index code
          const rawCode =
            item.SB || item.MC || item.CD || item.symbol || codesArr[idx] || '';
          return {
            symbol: KBS_CODE_TO_SYMBOL[rawCode] || rawCode,
            price: item.MI,
            change: item.ICH,
            changePercent: item.IPC,
            open: item.O,
            high: item.H,
            low: item.L,
            volume: item.AV,
            value: item.TVA,
            advances: item.ADV,
            declines: item.DE,
            noChange: item.NC,
            timestamp: item.time,
          };
        });

        this.cachedIndices = result;
        this.marketGateway.broadcastMarketIndices(result);
      }
    } catch (error) {
      // Catch ngầm để không spam console, hoặc bật lên nếu thấy cần thiết!
    }
  }

  /** Trả về dữ liệu indices đã cache từ polling */
  getLatestIndices() {
    return {
      message: 'Thành công',
      data: this.cachedIndices,
    };
  }

  private mapAllocatedIcbItem(item: AllocatedIcbRawItem) {
    return {
      icbCode: item.icb_code,
      icbChangePercent: this.toNumber(item.icbChangePercent),
      totalPriceChange: this.toNumber(item.totalPriceChange),
      totalMarketCap: this.toNumber(item.totalMarketCap),
      totalValue: this.toNumber(item.totalValue),
      totalStockIncrease: this.toNumber(item.totalStockIncrease),
      totalStockDecrease: this.toNumber(item.totalStockDecrease),
      totalStockNoChange: this.toNumber(item.totalStockNoChange),
      icbCodeParent: item.icbCodeParent,
    };
  }

  private mapAllocatedIcbDetailItem(item: AllocatedIcbDetailRawItem) {
    return {
      ...this.mapAllocatedIcbItem(item),
      stocks: (item.icbDataDetail || []).map((stock) => ({
        symbol: stock.symbol,
        referencePrice: this.toNumber(stock.refPrice),
        matchPrice: this.toNumber(stock.matchPrice),
        ceilingPrice: this.toNumber(stock.ceilingPrice),
        floorPrice: this.toNumber(stock.floorPrice),
        accumulatedVolume: this.toNumber(stock.accumulatedVolume),
        accumulatedValue: this.toNumber(stock.accumulatedValue),
        organName: stock.organName,
        organShortName: stock.organShortName,
        enOrganName: stock.enOrganName,
        enOrganShortName: stock.enOrganShortName,
        foreignNetVolume: this.toNumber(stock.foreignNetVolume),
        foreignNetValue: this.toNumber(stock.foreignNetValue),
        exchange: stock.board,
      })),
    };
  }

  private async getSectorSignalSnapshot(
    group: string,
  ): Promise<SectorSignalSnapshot> {
    const [dayData, weekData, monthData, metadataList, sessionStats] =
      await Promise.all([
        this.http.vciPost<AllocatedIcbRawItem[]>(
          '/market-watch/AllocatedICB/getAllocated',
          {
            group,
            timeFrame: 'ONE_DAY',
          },
        ),
        this.http.vciPost<AllocatedIcbRawItem[]>(
          '/market-watch/AllocatedICB/getAllocated',
          {
            group,
            timeFrame: 'ONE_WEEK',
          },
        ),
        this.http.vciPost<AllocatedIcbRawItem[]>(
          '/market-watch/AllocatedICB/getAllocated',
          {
            group,
            timeFrame: 'ONE_MONTH',
          },
        ),
        this.getIcbCodeMetadata(),
        this.getTradingSessionStats(),
      ]);

    const metadataMap = new Map(
      metadataList.map((item) => [item.icbCode, item] as const),
    );

    return {
      group,
      metadataList,
      metadataMap,
      dayMap: new Map((dayData || []).map((item) => [item.icb_code, item])),
      weekMap: new Map((weekData || []).map((item) => [item.icb_code, item])),
      monthMap: new Map((monthData || []).map((item) => [item.icb_code, item])),
      childCodeMap: this.buildIcbChildCodeMap(metadataList, [
        ...(dayData || []),
        ...(weekData || []),
        ...(monthData || []),
      ]),
      sessionStats,
      dayResolvedCache: new Map(),
      weekResolvedCache: new Map(),
      monthResolvedCache: new Map(),
    };
  }

  private getAllSectorSignalCodes(snapshot: SectorSignalSnapshot) {
    const codes = new Set<number>();

    for (const item of snapshot.metadataList) {
      codes.add(item.icbCode);
    }

    for (const code of snapshot.dayMap.keys()) codes.add(code);
    for (const code of snapshot.weekMap.keys()) codes.add(code);
    for (const code of snapshot.monthMap.keys()) codes.add(code);

    return Array.from(codes.values());
  }

  private buildSectorSignalItem(
    icbCode: number,
    snapshot: SectorSignalSnapshot,
  ): SectorSignalItem | null {
    const metadata = snapshot.metadataMap.get(icbCode);
    const dayItem = this.resolveAllocatedIcbItem(
      icbCode,
      snapshot.dayMap,
      snapshot.metadataMap,
      snapshot.childCodeMap,
      snapshot.dayResolvedCache,
    );
    const weekItem = this.resolveAllocatedIcbItem(
      icbCode,
      snapshot.weekMap,
      snapshot.metadataMap,
      snapshot.childCodeMap,
      snapshot.weekResolvedCache,
    );
    const monthItem = this.resolveAllocatedIcbItem(
      icbCode,
      snapshot.monthMap,
      snapshot.metadataMap,
      snapshot.childCodeMap,
      snapshot.monthResolvedCache,
    );

    if (!dayItem && !weekItem && !monthItem) return null;

    const metrics = this.buildSectorSignalMetrics(
      dayItem,
      weekItem,
      monthItem,
      snapshot.sessionStats,
    );

    return {
      icbCode,
      icbName: metadata?.icbName || null,
      enIcbName: metadata?.enIcbName || null,
      icbLevel: metadata?.level || null,
      icbCodeParent:
        dayItem?.icbCodeParent ??
        weekItem?.icbCodeParent ??
        monthItem?.icbCodeParent ??
        null,
      input: {
        ...metrics,
        tradingDaysInWeek: snapshot.sessionStats.tradingDaysInWeek,
        tradingDaysInMonth: snapshot.sessionStats.tradingDaysInMonth,
      },
      result: this.evaluateSectorSignal(metrics),
    };
  }

  private buildIcbChildCodeMap(
    metadata: IcbCodeMetadata[],
    items: AllocatedIcbRawItem[],
  ) {
    const childCodesByParent = new Map<number, Set<number>>();
    const addChild = (parentCode: number | null, childCode: number) => {
      if (parentCode === null || parentCode === childCode) return;

      if (!childCodesByParent.has(parentCode)) {
        childCodesByParent.set(parentCode, new Set());
      }

      childCodesByParent.get(parentCode)?.add(childCode);
    };

    for (const item of items) {
      addChild(item.icbCodeParent, item.icb_code);
    }

    for (const item of metadata) {
      addChild(this.inferIcbParentCode(item.icbCode, item.level), item.icbCode);
    }

    return new Map(
      Array.from(childCodesByParent.entries()).map(([parentCode, childCodes]) => [
        parentCode,
        Array.from(childCodes.values()),
      ]),
    );
  }

  private resolveAllocatedIcbItem(
    icbCode: number,
    itemMap: Map<number, AllocatedIcbRawItem>,
    metadataMap: Map<number, IcbCodeMetadata>,
    childCodeMap: Map<number, number[]>,
    cache: Map<number, AllocatedIcbRawItem | null>,
    visiting = new Set<number>(),
  ): AllocatedIcbRawItem | undefined {
    if (cache.has(icbCode)) {
      return cache.get(icbCode) || undefined;
    }

    const directItem = itemMap.get(icbCode);
    if (directItem) {
      cache.set(icbCode, directItem);
      return directItem;
    }

    if (visiting.has(icbCode)) return undefined;

    visiting.add(icbCode);

    const resolvedChildren = (childCodeMap.get(icbCode) || [])
      .map((childCode) =>
        this.resolveAllocatedIcbItem(
          childCode,
          itemMap,
          metadataMap,
          childCodeMap,
          cache,
          visiting,
        ),
      )
      .filter((item): item is AllocatedIcbRawItem => Boolean(item));

    visiting.delete(icbCode);

    if (resolvedChildren.length === 0) {
      cache.set(icbCode, null);
      return undefined;
    }

    const aggregatedItem = this.aggregateAllocatedIcbItems(
      icbCode,
      resolvedChildren,
      metadataMap.get(icbCode),
    );

    cache.set(icbCode, aggregatedItem);
    return aggregatedItem;
  }

  private aggregateAllocatedIcbItems(
    icbCode: number,
    items: AllocatedIcbRawItem[],
    metadata?: IcbCodeMetadata,
  ): AllocatedIcbRawItem {
    const totalPriceChange = this.sumNumbers(
      items.map((item) => this.toNumber(item.totalPriceChange)),
    );
    const totalMarketCap = this.sumNumbers(
      items.map((item) => this.toNumber(item.totalMarketCap)),
    );
    const totalValue = this.sumNumbers(
      items.map((item) => this.toNumber(item.totalValue)),
    );

    return {
      icb_code: icbCode,
      icbChangePercent:
        totalPriceChange !== null && totalMarketCap !== null && totalMarketCap > 0
          ? (totalPriceChange / totalMarketCap) * 100
          : null,
      totalPriceChange,
      totalMarketCap,
      totalValue,
      totalStockIncrease: this.sumNumbers(
        items.map((item) => this.toNumber(item.totalStockIncrease)),
      ),
      totalStockDecrease: this.sumNumbers(
        items.map((item) => this.toNumber(item.totalStockDecrease)),
      ),
      totalStockNoChange: this.sumNumbers(
        items.map((item) => this.toNumber(item.totalStockNoChange)),
      ),
      icbCodeParent: this.inferIcbParentCode(icbCode, metadata?.level ?? null),
    };
  }

  private buildSectorSignalMetrics(
    dayItem: AllocatedIcbRawItem | undefined,
    weekItem: AllocatedIcbRawItem | undefined,
    monthItem: AllocatedIcbRawItem | undefined,
    sessionStats: TradingSessionStats,
  ): SectorSignalInputMetrics {
    const D = this.toNumber(dayItem?.icbChangePercent);
    const W = this.toNumber(weekItem?.icbChangePercent);
    const M = this.toNumber(monthItem?.icbChangePercent);
    const VD = this.toNumber(dayItem?.totalValue);
    const VW = this.toNumber(weekItem?.totalValue);
    const VM = this.toNumber(monthItem?.totalValue);

    const tradingDaysInWeek = sessionStats.tradingDaysInWeek;
    const tradingDaysInMonth = sessionStats.tradingDaysInMonth;

    const MDW =
      VD !== null && VW !== null && tradingDaysInWeek > 0 && VW > 0
        ? VD / (VW / tradingDaysInWeek)
        : null;
    const MDM =
      VD !== null && VM !== null && tradingDaysInMonth > 0 && VM > 0
        ? VD / (VM / tradingDaysInMonth)
        : null;
    const MWM = VW !== null && VM !== null && VM > 0 ? VW / (VM / 4) : null;

    return {
      D,
      W,
      M,
      VD,
      VW,
      VM,
      MDW,
      MDM,
      MWM,
    };
  }

  private evaluateSectorSignal(
    input: SectorSignalInputMetrics,
  ): SectorSignalEvaluation {
    const matchedLabels = SECTOR_SIGNAL_RULES.filter((rule) =>
      rule.matches(input),
    ).map((rule) => rule.label);

    return {
      label: matchedLabels[0] || this.getClosestSectorSignalLabel(input),
      matchedLabels,
      isExactMatch: matchedLabels.length > 0,
    };
  }

  private getClosestSectorSignalLabel(input: SectorSignalInputMetrics) {
    const penalties = [
      {
        label: 'Dẫn sóng',
        penalty:
          this.minPenalty(input.M, 4, true) +
          this.minPenalty(input.W, 2) +
          this.minPenalty(input.D, 0) +
          this.minPenalty(input.MDM, 1.2) +
          this.minPenalty(input.MWM, 1.1),
      },
      {
        label: 'Hút tiền',
        penalty:
          this.minPenalty(input.M, -6, true) +
          this.minPenalty(input.W, -2, true) +
          Math.min(
            this.minPenalty(input.MDM, 1.4),
            this.minPenalty(input.MWM, 1.2),
          ),
      },
      {
        label: 'Tích lũy',
        penalty:
          this.rangePenalty(input.W, -2, 2) +
          this.rangePenalty(input.M, -5, 5) +
          this.rangePenalty(input.D, -1.5, 1.5) +
          this.rangePenalty(input.MDM, 0.9, 1.2) +
          this.rangePenalty(input.MWM, 0.9, 1.1),
      },
      {
        label: 'Phân phối',
        penalty:
          this.minPenalty(input.M, 6) +
          this.maxPenalty(input.W, -2) +
          this.maxPenalty(input.D, 0) +
          Math.min(
            this.minPenalty(input.MDM, 1.2),
            this.minPenalty(input.MWM, 1.1),
          ),
      },
      {
        label: 'Hồi kỹ thuật',
        penalty:
          this.maxPenalty(input.M, -8) +
          this.minPenalty(input.D, 0, true) +
          this.minPenalty(input.MDW, 1.0),
      },
      {
        label: 'Suy yếu',
        penalty:
          this.maxPenalty(input.M, -6) +
          this.maxPenalty(input.W, -3) +
          this.maxPenalty(input.MDM, 1.2, true) +
          this.maxPenalty(input.MWM, 1.1, true),
      },
    ];

    penalties.sort((a, b) => a.penalty - b.penalty);
    return penalties[0]?.label || 'Tích lũy';
  }

  private compareSectorSignalItems(
    left: SectorSignalItem,
    right: SectorSignalItem,
  ) {
    const levelDiff =
      (left.icbLevel ?? Number.MAX_SAFE_INTEGER) -
      (right.icbLevel ?? Number.MAX_SAFE_INTEGER);
    if (levelDiff !== 0) return levelDiff;

    return left.icbCode - right.icbCode;
  }

  private getSectorSignalCacheKey(group: string, icbCode: number) {
    return `trading:sector-signals:${group}:${icbCode}`;
  }

  private getAllSectorSignalsCacheKey(group: string) {
    return `trading:sector-signals:all-levels:${group}`;
  }

  private async getIcbCodeMetadata(): Promise<IcbCodeMetadata[]> {
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
    const items = result?.data?.ListIcbCode || [];

    return items.map((item: any) => ({
      icbCode: Number(item.icbCode),
      level: this.toNumber(item.level),
      icbName: item.icbName || null,
      enIcbName: item.enIcbName || null,
    }));
  }

  private async getTradingSessionStats(): Promise<TradingSessionStats> {
    const to = Math.floor(Date.now() / 1000);
    const raw = await this.http.vciPost<any[]>('/chart/OHLCChart/gap-chart', {
      timeFrame: 'ONE_DAY',
      symbols: ['VNINDEX'],
      to,
      countBack: 40,
    });

    const timestamps: number[] = raw?.[0]?.t || [];
    if (timestamps.length === 0) {
      return {
        latestTradingDate: null,
        tradingDaysInWeek: 0,
        tradingDaysInMonth: 0,
      };
    }

    const latestDate = new Date(timestamps[timestamps.length - 1] * 1000);
    const latestDateParts = this.getZonedDateParts(latestDate);
    const latestComparableDate = this.toComparableUtcDate(latestDateParts);
    const weekWindowStart = new Date(latestComparableDate);
    const monthWindowStart = new Date(latestComparableDate);

    weekWindowStart.setUTCDate(weekWindowStart.getUTCDate() - 7);
    monthWindowStart.setUTCMonth(monthWindowStart.getUTCMonth() - 1);

    let tradingDaysInWeek = 0;
    let tradingDaysInMonth = 0;

    for (const timestamp of timestamps) {
      const parts = this.getZonedDateParts(new Date(timestamp * 1000));
      const comparableDate = this.toComparableUtcDate(parts);

      if (comparableDate > weekWindowStart) tradingDaysInWeek++;
      if (comparableDate > monthWindowStart) tradingDaysInMonth++;
    }

    return {
      latestTradingDate: this.getDateKey(latestDateParts),
      tradingDaysInWeek,
      tradingDaysInMonth,
    };
  }

  private getZonedDateParts(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });

    const parts = formatter.formatToParts(date);
    const valueOf = (type: string) =>
      parts.find((part) => part.type === type)?.value || '';

    return {
      year: Number(valueOf('year')),
      month: Number(valueOf('month')),
      day: Number(valueOf('day')),
      weekday: valueOf('weekday'),
    };
  }

  private getDateKey(parts: { year: number; month: number; day: number }) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
      parts.day,
    ).padStart(2, '0')}`;
  }

  private inferIcbParentCode(icbCode: number, level: number | null) {
    if (level === null || level <= 1) return null;

    const normalizedCode = String(icbCode).padStart(4, '0');

    if (level === 2) {
      if (normalizedCode.startsWith('0')) return 1;
      return Number(`${normalizedCode[0]}000`);
    }

    if (level === 3) return Number(`${normalizedCode.slice(0, 2)}00`);
    if (level === 4) return Number(`${normalizedCode.slice(0, 3)}0`);

    return null;
  }

  private getMonthKey(parts: { year: number; month: number }) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
  }

  private getWeekKey(parts: {
    year: number;
    month: number;
    day: number;
    weekday: string;
  }) {
    const weekdayMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    const weekdayIndex = weekdayMap[parts.weekday] ?? 0;
    const currentDate = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    );
    currentDate.setUTCDate(currentDate.getUTCDate() - weekdayIndex);

    return `${currentDate.getUTCFullYear()}-${String(
      currentDate.getUTCMonth() + 1,
    ).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
  }

  private toComparableUtcDate(parts: {
    year: number;
    month: number;
    day: number;
  }) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  }

  private minPenalty(
    value: number | null,
    min: number,
    strict = false,
  ): number {
    if (value === null) return Number.MAX_SAFE_INTEGER;
    if (strict) return value > min ? 0 : min - value + 0.000001;
    return Math.max(0, min - value);
  }

  private maxPenalty(
    value: number | null,
    max: number,
    strict = false,
  ): number {
    if (value === null) return Number.MAX_SAFE_INTEGER;
    if (strict) return value < max ? 0 : value - max + 0.000001;
    return Math.max(0, value - max);
  }

  private rangePenalty(value: number | null, min: number, max: number): number {
    if (value === null) return Number.MAX_SAFE_INTEGER;
    if (value < min) return min - value;
    if (value > max) return value - max;
    return 0;
  }

  private sumNumbers(values: Array<number | null>) {
    const numbers = values.filter((value): value is number => value !== null);
    if (numbers.length === 0) return null;
    return numbers.reduce((total, value) => total + value, 0);
  }

  private toNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
