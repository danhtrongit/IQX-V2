import { Injectable, Logger } from '@nestjs/common';
import { AiNewsService } from '../ai-news/ai-news.service';
import { CompanyService } from '../company/company.service';
import { QuoteService } from '../quote/quote.service';

export interface InsightRawData {
  symbol: string;
  ohlcv: any[];
  realtime: any;
  supplyDemand: any[];
  foreignFlow: any[];
  proprietaryFlow: any[];
  insiderTransactions: any[];
  news: any[];
  tickerScore: any;
}

@Injectable()
export class InsightDataCollector {
  private readonly logger = new Logger(InsightDataCollector.name);

  constructor(
    private companyService: CompanyService,
    private quoteService: QuoteService,
    private aiNews: AiNewsService,
  ) {}

  async collect(symbol: string): Promise<InsightRawData> {
    const upper = symbol.toUpperCase();

    const [
      supplyDemandRes,
      foreignFlowRes,
      proprietaryFlowRes,
      insiderRes,
      news,
      tickerScore,
      ohlcvRes,
    ] = await Promise.allSettled([
      this.companyService.getSupplyDemand(
        upper,
        'D',
        undefined,
        undefined,
        0,
        35,
      ),
      this.companyService.getForeignFlow(
        upper,
        'D',
        undefined,
        undefined,
        0,
        35,
      ),
      this.companyService.getProprietaryFlow(
        upper,
        'D',
        undefined,
        undefined,
        0,
        35,
      ),
      this.companyService.getInsiderTransactions(upper, 0, 30),
      this.fetchNews(upper),
      this.fetchTickerScore(upper),
      this.fetchOHLCV(upper),
    ]);

    // Extract data from service responses
    const sdData = this.extractServiceData(supplyDemandRes);
    const ffData = this.extractServiceData(foreignFlowRes);
    const pfData = this.extractServiceData(proprietaryFlowRes);
    const insData = this.extractServiceData(insiderRes);

    // OHLCV: extract from supply-demand response (has closePrice, openPrice, etc.)
    // OR use dedicated OHLCV from QuoteService
    const ohlcvData = this.extract(ohlcvRes, []);
    const validOhlcv = ohlcvData.length > 0 ? ohlcvData : this.extractOHLCVFromSD(sdData);

    const checkIsTradingHour = () => {
      const now = new Date();
      // UTC+7
      const vnTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
      const day = vnTime.getDay();
      const h = vnTime.getHours();
      const m = vnTime.getMinutes();
      const t = h * 60 + m;
      return day >= 1 && day <= 5 && t >= 540 && t <= 885; // 09:00 -> 14:45
    };

    const isTrading = checkIsTradingHour();
    const lastO = validOhlcv.length > 0 ? validOhlcv[validOhlcv.length - 1] : null;

    let realtime = null;
    if (isTrading && lastO) {
      realtime = {
        price: lastO.close,
        volume: lastO.volume,
        high: lastO.high,
        low: lastO.low,
        ref: lastO.open,
      };
    }

    return {
      symbol: upper,
      ohlcv: validOhlcv,
      realtime,
      supplyDemand: sdData,
      foreignFlow: ffData,
      proprietaryFlow: pfData,
      insiderTransactions: insData,
      news: this.extract(news, []),
      tickerScore: this.extract(tickerScore, null),
    };
  }

  // ── OHLCV from QuoteService (KBS + VCI chart fallback) ──

  private formatDateDDMMYYYY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  private async fetchOHLCV(symbol: string) {
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days
    const result = await this.quoteService.getHistory(
      symbol,
      '1D',
      this.formatDateDDMMYYYY(from),
      this.formatDateDDMMYYYY(to),
    );
    const data = result?.data || [];
    return data.slice(-30).map((r: any) => ({
      date: typeof r.time === 'string' && r.time.includes('T') ? r.time.split('T')[0] : r.tradingDate || r.date || r.time || '',
      open: r.open ?? r.openPrice ?? 0,
      high: r.high ?? r.highPrice ?? 0,
      low: r.low ?? r.lowPrice ?? 0,
      close: r.close ?? r.closePrice ?? 0,
      volume: r.volume ?? r.totalVolume ?? 0,
    }));
  }

  // ── Fallback: extract OHLCV from supply-demand data ──

  private extractOHLCVFromSD(sdData: any[]): any[] {
    return sdData
      .slice(0, 30)
      .map((r: any) => ({
        date: r.date || '',
        open: r.openPrice ?? 0,
        high: r.highPrice ?? 0,
        low: r.lowPrice ?? 0,
        close: r.closePrice ?? 0,
        volume: r.totalVolume ?? 0,
      }))
      .reverse(); // oldest first
  }

  // ── AI News ──

  private async fetchNews(symbol: string) {
    const result = await this.aiNews.getNews({
      ticker: symbol,
      pageSize: 10,
      language: 'vi',
    });
    return result.data || [];
  }

  private async fetchTickerScore(symbol: string) {
    const result = await this.aiNews.getTickerScore(symbol, 'vi');
    return result.data || null;
  }

  // ── Utils ──

  private extractServiceData(result: PromiseSettledResult<any>): any[] {
    if (result.status === 'fulfilled') {
      return result.value?.data || [];
    }
    this.logger.warn(
      `Service call failed: ${(result as any).reason?.message || 'unknown'}`,
    );
    return [];
  }

  private extract<T>(result: PromiseSettledResult<T>, fallback: T): T {
    if (result.status === 'fulfilled') return result.value;
    this.logger.warn(
      `Data fetch failed: ${(result as any).reason?.message || 'unknown'}`,
    );
    return fallback;
  }
}
