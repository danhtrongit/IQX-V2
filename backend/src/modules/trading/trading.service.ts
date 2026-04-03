import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { DATA_SOURCES } from '../../common/constants/data-sources.constant';
import { KBS_EXCHANGE_MAP } from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';
import { MarketDataGateway } from './market-data.gateway';

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private cachedIndices: any[] = [];


  constructor(
    private http: ProxyHttpService,
    private marketGateway: MarketDataGateway,
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
          const rawCode = item.SB || item.MC || item.CD || item.symbol || codesArr[idx] || '';
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
}
