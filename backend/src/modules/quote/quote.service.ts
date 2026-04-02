import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import {
  KBS_INTERVAL_MAP,
  VCI_INTERVAL_MAP,
} from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(private http: ProxyHttpService) {}

  private isIndexSymbol(symbol: string): boolean {
    return [
      'VNINDEX',
      'VN30',
      'HNX',
      'HNXINDEX',
      'HNX30',
      'UPCOM',
      'UPCOMINDEX',
      'VN100',
      'VNMID',
      'VNSMALL',
      'VNALL',
    ].includes(symbol.toUpperCase());
  }

  /** Giá lịch sử OHLCV */
  async getHistory(
    symbol: string,
    interval = '1D',
    from?: string,
    to?: string,
  ) {
    const data = await this.http.withFallback(
      () => this.isIndexSymbol(symbol)
        ? this.getIndexHistoryFromKbs(symbol, interval, from, to)
        : this.getHistoryFromKbs(symbol, interval, from, to),
      () => this.getHistoryFromVci(symbol, interval),
      'quote.getHistory',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Khớp lệnh intraday */
  async getIntraday(symbol: string, page = 1, limit = 100) {
    if (this.isIndexSymbol(symbol)) {
      const data = await this.getIntradayFromVci(symbol, limit);
      return { message: MESSAGES.COMMON.SUCCESS, data };
    }

    const data = await this.http.withFallback(
      () => this.getIntradayFromKbs(symbol, page, limit),
      () => this.getIntradayFromVci(symbol, limit),
      'quote.getIntraday',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  // ---------- KBS ----------

  private async getHistoryFromKbs(
    symbol: string,
    interval: string,
    from?: string,
    to?: string,
  ) {
    const suffix = KBS_INTERVAL_MAP[interval] || 'day';
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sdate = from || this.formatDateKbs(oneYearAgo);
    const edate = to || this.formatDateKbs(now);

    const raw = await this.http.kbsGet<any>(
      `/stocks/${symbol.toUpperCase()}/data_${suffix}`,
      { sdate, edate },
    );

    const key = `data_${suffix}`;
    const items: any[] = raw?.[key] || [];

    return items.map((item) => ({
      time: item.t,
      open: item.o / 1000,
      high: item.h / 1000,
      low: item.l / 1000,
      close: item.c / 1000,
      volume: item.v,
      value: item.va || null,
      reference: item.re ? item.re / 1000 : null,
      ceiling: item.cl ? item.cl / 1000 : null,
      floor: item.fl ? item.fl / 1000 : null,
      foreignBuy: item.fb || null,
      foreignSell: item.fs || null,
      foreignNet: item.fnet || null,
    }));
  }

  private async getIndexHistoryFromKbs(
    symbol: string,
    interval: string,
    from?: string,
    to?: string,
  ) {
    const suffix = KBS_INTERVAL_MAP[interval] || 'day';
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sdate = from || this.formatDateKbs(oneYearAgo);
    const edate = to || this.formatDateKbs(now);

    const raw = await this.http.kbsGet<any>(
      `/index/${symbol.toUpperCase()}/data_${suffix}`,
      { sdate, edate },
    );

    const key = `data_${suffix}`;
    const items: any[] = raw?.[key] || [];

    return items.map((item) => ({
      time: item.time || item.t,
      open: item.o ? item.o / 1000 : null,
      high: item.h ? item.h / 1000 : null,
      low: item.l ? item.l / 1000 : null,
      close: item.c ? item.c / 1000 : null,
      volume: item.v || item.volume,
      value: item.va || item.value || null,
    }));
  }

  private async getIntradayFromKbs(
    symbol: string,
    page: number,
    limit: number,
  ) {
    const raw = await this.http.kbsGet<any>(
      `/trade/history/${symbol.toUpperCase()}`,
      { page, limit },
    );

    const items: any[] = raw?.data || [];
    return items.map((item) => ({
      time: item.FT || item.t,
      date: item.TD,
      symbol: item.SB,
      price: item.FMP ? item.FMP / 1000 : null,
      volume: item.FV,
      side: item.LC === 'B' ? 'BUY' : 'SELL',
      accumulatedVolume: item.AVO || null,
      accumulatedValue: item.AVA || null,
    }));
  }

  // ---------- VCI ----------

  private async getHistoryFromVci(symbol: string, interval: string) {
    const timeFrame = VCI_INTERVAL_MAP[interval] || 'ONE_DAY';
    const to = Math.floor(Date.now() / 1000);

    const raw = await this.http.vciPost<any[]>('/chart/OHLCChart/gap-chart', {
      timeFrame,
      symbols: [symbol.toUpperCase()],
      to,
      countBack: 365,
    });

    if (!raw || !raw[0]) return [];

    const d = raw[0];
    const count = d.t?.length || 0;
    const result = [];

    for (let i = 0; i < count; i++) {
      result.push({
        time: new Date((d.t[i] || 0) * 1000).toISOString(),
        open: d.o[i],
        high: d.h[i],
        low: d.l[i],
        close: d.c[i],
        volume: d.v[i],
        value: null,
        reference: null,
        ceiling: null,
        floor: null,
        foreignBuy: null,
        foreignSell: null,
        foreignNet: null,
      });
    }

    // VCI returns newest-first → sort ascending (oldest-first) to match KBS format
    result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return result;
  }

  private async getIntradayFromVci(symbol: string, limit: number) {
    const raw = await this.http.vciPost<any[]>('/market-watch/LEData/getAll', {
      symbol: symbol.toUpperCase(),
      limit,
      truncTime: null,
    });

    return (raw || []).map((item) => ({
      time: new Date(item.truncTime).toISOString(),
      date: null,
      symbol: symbol.toUpperCase(),
      price: item.matchPrice,
      volume: item.matchVol,
      side: item.matchType === 'B' ? 'BUY' : 'SELL',
      accumulatedVolume: null,
      accumulatedValue: null,
    }));
  }

  private formatDateKbs(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}
