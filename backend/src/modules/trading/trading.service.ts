import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { existsSync, promises as fsPromises } from 'node:fs';
import * as path from 'node:path';
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

interface IcbCodeJsonItem {
  name?: string | number | null;
  viSector?: string | null;
  enSector?: string | null;
  icbLevel?: number | string | null;
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

type SectorSignalLabel =
  | 'Dẫn sóng'
  | 'Hút tiền'
  | 'Tích lũy'
  | 'Phân phối'
  | 'Hồi kỹ thuật'
  | 'Suy yếu';

interface SectorSignalEvaluation {
  label: SectorSignalLabel | null;
  matchedLabels: SectorSignalLabel[];
  isExactMatch: boolean;
}

interface TradingSessionStats {
  latestTradingDate: string | null;
  tradingDaysInWeek: number;
  tradingDaysInMonth: number;
  benchmark: BenchmarkChangeMetrics;
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

interface BenchmarkChangeMetrics {
  symbol: string;
  D: number | null;
  W: number | null;
  M: number | null;
}

interface SectorInsightSummary {
  status: string;
  performance: {
    text: string;
    changePercent: number | null;
    benchmarkChangePercent: number | null;
    relativePercent: number | null;
  };
  moneyFlow: {
    text: string;
    ratio: number | null;
  };
  breadth: {
    text: string;
    advancing: number;
    declining: number;
    unchanged: number;
    total: number;
  };
  leaders: {
    text: string;
    symbols: string[];
    concentrationRatio: number | null;
  };
  weakness: string;
  opportunity: string;
  risk: string;
}

interface SectorOverviewGroup {
  label: string;
  rule: string;
  limit: number | null;
  totalCandidates: number;
  industries: Array<
    SectorSignalItem & {
      insight: SectorInsightSummary;
    }
  >;
}

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const SECTOR_SIGNAL_ALL_LEVELS_MAX_LEVEL = 2;

const SECTOR_SIGNAL_RULES = [
  {
    label: 'Dẫn sóng',
    condition: 'M > 2% & W >= 2 & D >= 0 & MDM >= 1.2 & MWM >= 1.1',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M > 2 &&
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
    condition: 'W > 0 & (MDM >= 1.4 or MWM >= 1.2)',
    matches: (input: SectorSignalInputMetrics) =>
      input.W !== null &&
      input.W > 0 &&
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
    condition: 'M <= -8 & W > 1 & D > 0 & MDW >= 1.0',
    matches: (input: SectorSignalInputMetrics) =>
      input.M !== null &&
      input.M <= -8 &&
      input.W !== null &&
      input.W > 1 &&
      input.D !== null &&
      input.D > 0 &&
      input.MDW !== null &&
      input.MDW >= 1.0,
  },
  {
    label: 'Suy yếu',
    condition: 'W <= -3 & MDM < 1.2 & MWM < 1.1',
    matches: (input: SectorSignalInputMetrics) =>
      input.W !== null &&
      input.W <= -3 &&
      input.MDM !== null &&
      input.MDM < 1.2 &&
      input.MWM !== null &&
      input.MWM < 1.1,
  },
] as const;

const SECTOR_OVERVIEW_CONFIG: Record<
  SectorSignalLabel,
  { limit: number | null; rule: string }
> = {
  'Dẫn sóng': {
    limit: 1,
    rule: 'M > 2% & W >= 2 & D >= 0 & MDM >= 1.2 & MWM >= 1.1',
  },
  'Hút tiền': {
    limit: 2,
    rule: 'W > 0 & (MDM >= 1.4 or MWM >= 1.2)',
  },
  'Tích lũy': {
    limit: 3,
    rule: '-2 <= W <= 2 & -5 <= M <= 5 & -1.5 <= D <= 1.5 & 0.9 <= MDM <= 1.2 & 0.9 <= MWM <= 1.1',
  },
  'Phân phối': {
    limit: null,
    rule: 'M >= 6 & W <= -2 & D <= 0 & (MDM >= 1.2 or MWM >= 1.1)',
  },
  'Hồi kỹ thuật': {
    limit: null,
    rule: 'M <= -8 & W > 1 & D > 0 & MDW >= 1.0',
  },
  'Suy yếu': {
    limit: null,
    rule: 'W <= -3 & MDM < 1.2 & MWM < 1.1',
  },
};

const SECTOR_OVERVIEW_ORDER = [
  'Dẫn sóng',
  'Hút tiền',
  'Tích lũy',
  'Phân phối',
  'Hồi kỹ thuật',
  'Suy yếu',
] as const;

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private cachedIndices: any[] = [];
  private icbCodesJsonMetadataCache: IcbCodeMetadata[] | null = null;

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
    const applyTopLimit = payload.applyTopLimit ?? true;
    const debug = payload.debug ?? false;
    const cacheKey = this.getAllSectorSignalsCacheKey(group, applyTopLimit);

    if (!debug) {
      try {
        const cached = await this.cacheService.get<any>(cacheKey, CacheType.TRADING);
        if (cached) {
          this.logger.debug(`Cache HIT for all sector signals: ${group}`);
          return cached;
        }
      } catch (error) {
        this.logger.warn(`Cache get failed: ${error.message}`);
      }
    }

    const snapshot = await this.getSectorSignalSnapshot(group);
    const codes = this.getAllSectorSignalCodes(
      snapshot,
      SECTOR_SIGNAL_ALL_LEVELS_MAX_LEVEL,
    );
    const items = codes
      .map((icbCode) => this.buildSectorSignalItem(icbCode, snapshot))
      .filter((item): item is SectorSignalItem => item !== null)
      .sort((left, right) => this.compareSectorSignalItems(left, right));
    const selectedItems = this.selectAllLevelSectorSignalItems(
      items,
      applyTopLimit,
    );
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        group,
        asOfDate: snapshot.sessionStats.latestTradingDate,
        applyTopLimit,
        debug,
        total: selectedItems.length,
        items: selectedItems,
        ...(debug
          ? {
              debugInputs: await this.buildAllSectorDebugInputsFromIcbJson(
                snapshot,
              ),
            }
          : {}),
      },
    };

    if (!debug) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.TRADING);
      } catch (error) {
        this.logger.warn(`Cache set failed: ${error.message}`);
      }
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
        this.getTradingSessionStats(group),
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

  private getAllSectorSignalCodes(
    snapshot: SectorSignalSnapshot,
    maxLevel: number | null = null,
  ) {
    const codes = new Set<number>();
    const isAllowedLevel = (code: number) => {
      const level = snapshot.metadataMap.get(code)?.level ?? null;
      return maxLevel === null || level === null || level <= maxLevel;
    };

    for (const item of snapshot.metadataList) {
      if (!isAllowedLevel(item.icbCode)) continue;
      codes.add(item.icbCode);
    }

    for (const code of snapshot.dayMap.keys()) {
      if (isAllowedLevel(code)) codes.add(code);
    }
    for (const code of snapshot.weekMap.keys()) {
      if (isAllowedLevel(code)) codes.add(code);
    }
    for (const code of snapshot.monthMap.keys()) {
      if (isAllowedLevel(code)) codes.add(code);
    }

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

  private async buildSectorOverview(
    items: SectorSignalItem[],
    snapshot: SectorSignalSnapshot,
  ): Promise<SectorOverviewGroup[]> {
    const detailCache = new Map<number, AllocatedIcbDetailRawStock[]>();

    return Promise.all(
      SECTOR_OVERVIEW_ORDER.map(async (label) => {
        const config = SECTOR_OVERVIEW_CONFIG[label];
        const candidates = items
          .filter((item) => item.result.label === label)
          .sort((left, right) => this.compareSectorOverviewCandidates(left, right));
        const selectedCandidates =
          config.limit === null
            ? candidates
            : candidates.slice(0, Math.max(config.limit, 0));

        const industries = await Promise.all(
          selectedCandidates.map(async (item) => ({
            ...item,
            insight: await this.buildSectorInsightSummary(
              item,
              snapshot,
              detailCache,
            ),
          })),
        );

        return {
          label,
          rule: config.rule,
          limit: config.limit,
          totalCandidates: candidates.length,
          industries,
        };
      }),
    );
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
      label: matchedLabels[0] || null,
      matchedLabels,
      isExactMatch: matchedLabels.length > 0,
    };
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

  private compareSectorOverviewCandidates(
    left: SectorSignalItem,
    right: SectorSignalItem,
  ) {
    const mdwDiff = this.compareNullableNumbersDesc(
      left.input.MDW,
      right.input.MDW,
    );
    if (mdwDiff !== 0) return mdwDiff;

    if (left.result.isExactMatch !== right.result.isExactMatch) {
      return left.result.isExactMatch ? -1 : 1;
    }

    return this.compareSectorSignalItems(left, right);
  }

  private selectAllLevelSectorSignalItems(
    items: SectorSignalItem[],
    applyTopLimit = true,
  ) {
    return SECTOR_OVERVIEW_ORDER.flatMap((label) => {
      const { limit } = SECTOR_OVERVIEW_CONFIG[label];
      const candidates = items
        .filter(
          (item) => item.result.isExactMatch && item.result.label === label,
        )
        .sort((left, right) =>
          this.compareSectorOverviewCandidates(left, right),
        );

      if (!applyTopLimit || limit === null) return candidates;

      return candidates.slice(0, Math.max(limit, 0));
    });
  }

  private async buildSectorInsightSummary(
    item: SectorSignalItem,
    snapshot: SectorSignalSnapshot,
    detailCache: Map<number, AllocatedIcbDetailRawStock[]>,
  ): Promise<SectorInsightSummary> {
    const breadth = this.buildBreadthSummary(item.icbCode, snapshot);
    const detailStocks = await this.resolveAllocatedIcbDetailStocks(
      snapshot.group,
      item.icbCode,
      snapshot.childCodeMap,
      detailCache,
    );
    const leaders = this.buildLeadersSummary(item, detailStocks);

    return {
      status: item.result.label ?? 'Không xác định',
      performance: this.buildPerformanceSummary(item, snapshot.sessionStats),
      moneyFlow: this.buildMoneyFlowSummary(item),
      breadth,
      leaders,
      weakness: this.buildWeaknessSummary(item, breadth, leaders),
      opportunity: this.buildOpportunitySummary(item, breadth),
      risk: this.buildRiskSummary(item, breadth),
    };
  }

  private buildPerformanceSummary(
    item: SectorSignalItem,
    sessionStats: TradingSessionStats,
  ) {
    const changePercent = item.input.W;
    const benchmarkChangePercent = sessionStats.benchmark.W;
    const relativePercent =
      changePercent !== null && benchmarkChangePercent !== null
        ? changePercent - benchmarkChangePercent
        : null;

    return {
      text:
        changePercent === null
          ? 'Chưa đủ dữ liệu hiệu suất để đánh giá'
          : `${this.formatSignedPercent(changePercent)} trong ${
              sessionStats.tradingDaysInWeek
            } phiên${
              relativePercent === null
                ? ''
                : `, ${relativePercent >= 0 ? 'vượt' : 'kém'} ${
                    sessionStats.benchmark.symbol
                  } ${this.formatSignedPercent(Math.abs(relativePercent))}`
            }`,
      changePercent,
      benchmarkChangePercent,
      relativePercent,
    };
  }

  private buildMoneyFlowSummary(item: SectorSignalItem) {
    const dailyRatio = item.input.MDM;
    const weeklyRatio = item.input.MWM;
    const referenceDays = item.input.tradingDaysInMonth;

    if (dailyRatio === null && weeklyRatio === null) {
      return {
        text: 'Chưa đủ dữ liệu dòng tiền để so sánh với bình quân',
        ratio: null,
      };
    }

    if (dailyRatio !== null && dailyRatio >= 1) {
      return {
        text:
          dailyRatio >= 1
            ? `GTGD cao hơn bình quân ${referenceDays} phiên ${this.formatRatio(
                dailyRatio,
              )} lần`
            : `GTGD chỉ bằng ${this.formatRatio(dailyRatio)} lần bình quân ${referenceDays} phiên`,
        ratio: dailyRatio,
      };
    }

    if (weeklyRatio !== null) {
      return {
        text:
          weeklyRatio >= 1
            ? `GTGD tuần cao hơn nền thanh khoản 1 tháng ${this.formatRatio(
                weeklyRatio,
              )} lần`
            : `GTGD tuần chỉ bằng ${this.formatRatio(
                weeklyRatio,
              )} lần nền thanh khoản 1 tháng`,
        ratio: weeklyRatio,
      };
    }

    return {
      text: `GTGD chỉ bằng ${this.formatRatio(
        dailyRatio as number,
      )} lần bình quân ${referenceDays} phiên`,
      ratio: dailyRatio,
    };
  }

  private buildBreadthSummary(
    icbCode: number,
    snapshot: SectorSignalSnapshot,
  ) {
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
    const sourceItem = dayItem || weekItem || monthItem;
    const advancing = this.toInteger(this.toNumber(sourceItem?.totalStockIncrease));
    const declining = this.toInteger(this.toNumber(sourceItem?.totalStockDecrease));
    const unchanged = this.toInteger(this.toNumber(sourceItem?.totalStockNoChange));
    const total = advancing + declining + unchanged;

    return {
      text:
        total > 0
          ? `${advancing}/${total} mã tăng`
          : 'Chưa có dữ liệu độ rộng ngành',
      advancing,
      declining,
      unchanged,
      total,
    };
  }

  private buildLeadersSummary(
    item: SectorSignalItem,
    detailStocks: AllocatedIcbDetailRawStock[],
  ) {
    const sortedStocks = [...detailStocks].sort((left, right) => {
      return (
        this.toNumber(right.accumulatedValue) ?? 0
      ) - (this.toNumber(left.accumulatedValue) ?? 0);
    });
    const topStocks = sortedStocks.slice(0, 3);
    const totalTopValue = this.sumNumbers(
      topStocks.map((stock) => this.toNumber(stock.accumulatedValue)),
    );
    const totalSectorValue = item.input.VD;
    const concentrationRatio =
      totalTopValue !== null && totalSectorValue !== null && totalSectorValue > 0
        ? totalTopValue / totalSectorValue
        : null;

    return {
      text:
        topStocks.length > 0
          ? topStocks.map((stock) => stock.symbol).join(', ')
          : 'Chưa xác định được mã dẫn dắt',
      symbols: topStocks.map((stock) => stock.symbol),
      concentrationRatio,
    };
  }

  private buildWeaknessSummary(
    item: SectorSignalItem,
    breadth: SectorInsightSummary['breadth'],
    leaders: SectorInsightSummary['leaders'],
  ) {
    const breadthRatio =
      breadth.total > 0 ? breadth.advancing / breadth.total : null;

    switch (item.result.label) {
      case 'Dẫn sóng':
        if (leaders.concentrationRatio !== null && leaders.concentrationRatio >= 0.55) {
          return 'đà tăng còn phụ thuộc nhiều vào 3 mã đầu ngành';
        }
        if (breadthRatio !== null && breadthRatio < 0.6) {
          return 'độ rộng tăng chưa thực sự lan tỏa đồng đều trong toàn ngành';
        }
        return 'dòng tiền dẫn dắt mới tập trung ở một phần nhóm cổ phiếu mạnh';
      case 'Hút tiền':
        if ((item.input.W ?? 0) <= 1) {
          return 'giá chưa bứt tốc rõ dù dòng tiền đã cải thiện';
        }
        return 'dòng tiền vẫn thiên về các mã thanh khoản lớn hơn là lan rộng toàn ngành';
      case 'Tích lũy':
        return 'xung lực giá còn trung tính và thiếu cổ phiếu dẫn dắt rõ ràng';
      case 'Phân phối':
        return 'áp lực chốt lời đang lấn át sau nhịp tăng trước đó';
      case 'Hồi kỹ thuật':
        return 'đây mới là nhịp hồi ngắn hạn sau giai đoạn giảm sâu';
      case 'Suy yếu':
        return 'xu hướng giá và dòng tiền đều chưa cho tín hiệu cải thiện rõ';
      default:
        return 'động lực của ngành vẫn cần thêm tín hiệu xác nhận';
    }
  }

  private buildOpportunitySummary(
    item: SectorSignalItem,
    breadth: SectorInsightSummary['breadth'],
  ) {
    const breadthRatio =
      breadth.total > 0 ? breadth.advancing / breadth.total : null;

    switch (item.result.label) {
      case 'Dẫn sóng':
        return breadthRatio !== null && breadthRatio < 0.65
          ? 'nếu dòng tiền lan sang nhóm chưa tăng nhiều, ngành còn dư địa mở rộng đà tăng'
          : 'nếu thanh khoản duy trì và nhóm vốn hóa trung bình nhập cuộc, xu hướng còn có thể nối dài';
      case 'Hút tiền':
        return 'nếu hiệu suất tuần cải thiện thêm, ngành có thể chuyển sang trạng thái dẫn sóng';
      case 'Tích lũy':
        return 'nếu xuất hiện dòng tiền chủ động ở các mã dẫn dắt, ngành có thể sớm thoát nền tích lũy';
      case 'Phân phối':
        return 'nếu áp lực bán hạ nhiệt và thanh khoản ổn định lại, ngành có thể quay về vùng cân bằng';
      case 'Hồi kỹ thuật':
        return 'nếu lực cầu duy trì thêm vài phiên, ngành có thể cải thiện sang trạng thái tích lũy';
      case 'Suy yếu':
        return 'nếu xuất hiện lực cầu bắt đáy và breadth cải thiện, ngành có thể chuyển sang hồi kỹ thuật';
      default:
        return 'nếu các chỉ báo thanh khoản cải thiện, trạng thái ngành có thể tích cực hơn';
    }
  }

  private buildRiskSummary(
    item: SectorSignalItem,
    breadth: SectorInsightSummary['breadth'],
  ) {
    const breadthRatio =
      breadth.total > 0 ? breadth.advancing / breadth.total : null;

    switch (item.result.label) {
      case 'Dẫn sóng':
        return breadthRatio !== null && breadthRatio < 0.5
          ? 'nếu breadth tiếp tục thu hẹp, trạng thái dẫn sóng sẽ suy yếu nhanh'
          : 'nếu breadth thu hẹp hoặc thanh khoản giảm nhanh, trạng thái dẫn sóng sẽ suy yếu';
      case 'Hút tiền':
        return 'nếu dòng tiền không duy trì trên mức bình quân, trạng thái hút tiền dễ quay lại tích lũy';
      case 'Tích lũy':
        return 'nếu thị trường chung suy yếu, vùng tích lũy hiện tại có thể bị phá vỡ';
      case 'Phân phối':
        return 'nếu lực bán tiếp tục dồn vào các mã dẫn dắt, trạng thái phân phối sẽ kéo dài';
      case 'Hồi kỹ thuật':
        return 'nếu lực cầu suy yếu, nhịp hồi kỹ thuật hiện tại dễ thất bại';
      case 'Suy yếu':
        return 'nếu tiếp tục mất hỗ trợ cùng thanh khoản cạn, đà suy yếu sẽ kéo dài';
      default:
        return 'nếu thanh khoản giảm và lực cầu yếu đi, trạng thái ngành sẽ xấu hơn';
    }
  }

  private async resolveAllocatedIcbDetailStocks(
    group: string,
    icbCode: number,
    childCodeMap: Map<number, number[]>,
    cache: Map<number, AllocatedIcbDetailRawStock[]>,
    visiting = new Set<number>(),
  ): Promise<AllocatedIcbDetailRawStock[]> {
    if (cache.has(icbCode)) {
      return cache.get(icbCode) || [];
    }
    if (visiting.has(icbCode)) return [];

    visiting.add(icbCode);

    let stocks: AllocatedIcbDetailRawStock[] = [];

    try {
      const data = await this.http.vciPost<AllocatedIcbDetailRawItem | null>(
        '/market-watch/AllocatedICB/getAllocatedDetail',
        {
          group,
          timeFrame: 'ONE_DAY',
          icbCode,
        },
      );
      stocks = data?.icbDataDetail || [];
    } catch (error) {
      stocks = [];
    }

    if (stocks.length === 0) {
      for (const childCode of childCodeMap.get(icbCode) || []) {
        const childStocks = await this.resolveAllocatedIcbDetailStocks(
          group,
          childCode,
          childCodeMap,
          cache,
          visiting,
        );
        stocks.push(...childStocks);
      }
    }

    visiting.delete(icbCode);

    const uniqueStocks = Array.from(
      new Map(stocks.map((stock) => [stock.symbol, stock])).values(),
    );
    cache.set(icbCode, uniqueStocks);
    return uniqueStocks;
  }

  private getSectorSignalCacheKey(group: string, icbCode: number) {
    return `trading:sector-signals:v2:${group}:${icbCode}`;
  }

  private getAllSectorSignalsCacheKey(group: string, applyTopLimit = true) {
    if (!applyTopLimit) {
      return `trading:sector-signals:all-levels:v4:${group}:no-top`;
    }
    return `trading:sector-signals:all-levels:v3:${group}`;
  }

  private async buildAllSectorDebugInputsFromIcbJson(
    snapshot: SectorSignalSnapshot,
  ) {
    const metadataList = (await this.getIcbCodeMetadataFromIcbJson())
      .filter(
        (item) =>
          item.level !== null && item.level <= SECTOR_SIGNAL_ALL_LEVELS_MAX_LEVEL,
      )
      .sort((left, right) => left.icbCode - right.icbCode);
    const metadataMap = new Map(
      metadataList.map((item) => [item.icbCode, item] as const),
    );
    const childCodeMap = this.buildIcbChildCodeMap(metadataList, [
      ...snapshot.dayMap.values(),
      ...snapshot.weekMap.values(),
      ...snapshot.monthMap.values(),
    ]);
    const debugSnapshot: SectorSignalSnapshot = {
      ...snapshot,
      metadataList,
      metadataMap,
      childCodeMap,
      dayResolvedCache: new Map(),
      weekResolvedCache: new Map(),
      monthResolvedCache: new Map(),
    };
    const levelCounts = metadataList.reduce<Record<string, number>>(
      (counts, item) => {
        const key = String(item.level ?? 'unknown');
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      {},
    );

    return {
      source: 'icb-codes.json',
      maxLevel: SECTOR_SIGNAL_ALL_LEVELS_MAX_LEVEL,
      total: metadataList.length,
      levelCounts,
      items: metadataList.map((metadata) => {
        const item = this.buildSectorSignalItem(metadata.icbCode, debugSnapshot);
        if (item) {
          return {
            ...item,
            hasAllocatedData: true,
          };
        }

        return this.buildMissingSectorSignalItem(
          metadata,
          snapshot.sessionStats,
        );
      }),
    };
  }

  private buildMissingSectorSignalItem(
    metadata: IcbCodeMetadata,
    sessionStats: TradingSessionStats,
  ) {
    return {
      icbCode: metadata.icbCode,
      icbName: metadata.icbName,
      enIcbName: metadata.enIcbName,
      icbLevel: metadata.level,
      icbCodeParent: this.inferIcbParentCode(metadata.icbCode, metadata.level),
      input: this.buildEmptySectorSignalMetrics(sessionStats),
      result: {
        label: null,
        matchedLabels: [],
        isExactMatch: false,
      },
      hasAllocatedData: false,
    };
  }

  private buildEmptySectorSignalMetrics(sessionStats: TradingSessionStats) {
    return {
      D: null,
      W: null,
      M: null,
      VD: null,
      VW: null,
      VM: null,
      MDW: null,
      MDM: null,
      MWM: null,
      tradingDaysInWeek: sessionStats.tradingDaysInWeek,
      tradingDaysInMonth: sessionStats.tradingDaysInMonth,
    };
  }

  private async getIcbCodeMetadataFromIcbJson(): Promise<IcbCodeMetadata[]> {
    if (this.icbCodesJsonMetadataCache) {
      return this.icbCodesJsonMetadataCache;
    }

    const filePath = this.resolveIcbCodesJsonPath();
    if (!filePath) {
      this.logger.warn('Không tìm thấy file icb-codes.json để build debug inputs');
      return [];
    }

    try {
      const raw = await fsPromises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as { data?: IcbCodeJsonItem[] };
      const items = Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed)
          ? (parsed as IcbCodeJsonItem[])
          : [];
      const metadataMap = new Map<number, IcbCodeMetadata>();

      for (const item of items) {
        const icbCode = this.toNumber(item?.name ?? null);
        const level = this.toNumber(item?.icbLevel ?? null);
        if (icbCode === null || level === null) continue;
        if (metadataMap.has(icbCode)) continue;

        metadataMap.set(icbCode, {
          icbCode,
          level,
          icbName: item?.viSector || null,
          enIcbName: item?.enSector || null,
        });
      }

      this.icbCodesJsonMetadataCache = Array.from(metadataMap.values()).sort(
        (left, right) => left.icbCode - right.icbCode,
      );
      return this.icbCodesJsonMetadataCache;
    } catch (error) {
      this.logger.warn(`Đọc icb-codes.json thất bại: ${error.message}`);
      return [];
    }
  }

  private resolveIcbCodesJsonPath() {
    const candidates = [
      path.resolve(process.cwd(), 'icb-codes.json'),
      path.resolve(process.cwd(), '../icb-codes.json'),
      path.resolve(__dirname, '../../../../icb-codes.json'),
    ];

    return candidates.find((candidate) => existsSync(candidate)) || null;
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

  private async getTradingSessionStats(
    group: string,
  ): Promise<TradingSessionStats> {
    const benchmarkSymbol = this.getBenchmarkSymbolForGroup(group);
    const to = Math.floor(Date.now() / 1000);
    const raw = await this.http.vciPost<any[]>('/chart/OHLCChart/gap-chart', {
      timeFrame: 'ONE_DAY',
      symbols: [benchmarkSymbol],
      to,
      countBack: 40,
    });

    const timestamps: number[] = raw?.[0]?.t || [];
    const closes = (raw?.[0]?.c || []).map((value: number | string | null) =>
      this.toNumber(value),
    );
    if (timestamps.length === 0) {
      return {
        latestTradingDate: null,
        tradingDaysInWeek: 0,
        tradingDaysInMonth: 0,
        benchmark: {
          symbol: benchmarkSymbol,
          D: null,
          W: null,
          M: null,
        },
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
      benchmark: {
        symbol: benchmarkSymbol,
        D: this.calculatePeriodChange(closes, 2),
        W: this.calculatePeriodChange(closes, tradingDaysInWeek),
        M: this.calculatePeriodChange(closes, tradingDaysInMonth),
      },
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

  private sumNumbers(values: Array<number | null>) {
    const numbers = values.filter((value): value is number => value !== null);
    if (numbers.length === 0) return null;
    return numbers.reduce((total, value) => total + value, 0);
  }

  private calculatePeriodChange(
    values: Array<number | null>,
    sessions: number,
  ): number | null {
    const numbers = values.filter((value): value is number => value !== null);
    if (numbers.length < 2 || sessions <= 1) return null;

    const startIndex = Math.max(0, numbers.length - sessions);
    const start = numbers[startIndex];
    const end = numbers[numbers.length - 1];

    if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
      return null;
    }

    return ((end - start) / start) * 100;
  }

  private getBenchmarkSymbolForGroup(group: string) {
    const normalizedGroup = group.toUpperCase();

    if (normalizedGroup === 'HNX') return 'HNX';
    if (normalizedGroup === 'UPCOM') return 'UPCOM';

    return 'VNINDEX';
  }

  private formatSignedPercent(value: number) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private formatRatio(value: number) {
    return value.toFixed(1);
  }

  private toInteger(value: number | null) {
    if (value === null || !Number.isFinite(value)) return 0;
    return Math.round(value);
  }

  private compareNullableNumbersDesc(
    left: number | null,
    right: number | null,
  ) {
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  }

  private toNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
