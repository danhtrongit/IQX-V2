import { Injectable } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { DATA_SOURCES } from '../../common/constants/data-sources.constant';
import { KBS_EXCHANGE_MAP } from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class TradingService {
  constructor(private http: ProxyHttpService) {}

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
    const raw = await this.http.vciPost<any[]>('/price/symbols/getList', { symbols });

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
}
