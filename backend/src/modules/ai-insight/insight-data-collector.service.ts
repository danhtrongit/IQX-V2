import { Injectable, Logger } from '@nestjs/common';
import { AiNewsService } from '../ai-news/ai-news.service';
import { CompanyService } from '../company/company.service';
import { QuoteService } from '../quote/quote.service';
import { TradingService } from '../trading/trading.service';

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
    private tradingService: TradingService,
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
      livePriceRes,
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
      this.fetchLivePrice(upper),
    ]);

    // Extract data from service responses
    const sdData = this.extractServiceData(supplyDemandRes);
    const ffData = this.extractServiceData(foreignFlowRes);
    const pfData = this.extractServiceData(proprietaryFlowRes);
    const insData = this.extractServiceData(insiderRes);

    // OHLCV: extract from QuoteService (oldest-first after sort fix)
    const ohlcvData = this.extract(ohlcvRes, []);
    const validOhlcv = ohlcvData.length > 0 ? ohlcvData : this.extractOHLCVFromSD(sdData);

    // Ensure OHLCV is sorted oldest-first (defensive)
    validOhlcv.sort((a: any, b: any) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tA - tB;
    });

    // Live price from price-board API (truly realtime)
    const liveData = this.extractLivePrice(livePriceRes);
    const lastO = validOhlcv.length > 0 ? validOhlcv[validOhlcv.length - 1] : null;

    // Build realtime: prefer live price-board data, fallback to OHLCV last bar
    let realtime = null;
    if (liveData) {
      // Price-board data is in "thousands" format (e.g., 139.4 = 139,400 VND)
      realtime = {
        price: liveData.closePrice,
        volume: liveData.totalVolume,
        high: liveData.highestPrice,
        low: liveData.lowestPrice,
        ref: liveData.referencePrice,
        change: liveData.priceChange,
        changePercent: liveData.percentChange,
      };
      this.logger.debug(
        `Live price for ${upper}: ${liveData.closePrice} (ref: ${liveData.referencePrice})`,
      );
    } else if (lastO) {
      // Fallback: use OHLCV last bar close (may be stale)
      realtime = {
        price: lastO.close,
        volume: lastO.volume,
        high: lastO.high,
        low: lastO.low,
        ref: lastO.open,
      };
      this.logger.warn(
        `No live price for ${upper}, falling back to OHLCV last bar: ${lastO.close}`,
      );
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

  // ── Live price from price-board (TradingService) ──

  private async fetchLivePrice(symbol: string) {
    const result = await this.tradingService.getPriceBoard([symbol]);
    const items = result?.data || [];
    return items.length > 0 ? items[0] : null;
  }

  private extractLivePrice(result: PromiseSettledResult<any>): any | null {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
    if (result.status === 'rejected') {
      this.logger.warn(
        `Live price fetch failed: ${(result as any).reason?.message || 'unknown'}`,
      );
    }
    return null;
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

    // Map and take last 30 bars (data should be oldest-first after QuoteService sort fix)
    const mapped = data.map((r: any) => ({
      date: typeof r.time === 'string' && r.time.includes('T') ? r.time.split('T')[0] : r.tradingDate || r.date || r.time || '',
      open: r.open ?? r.openPrice ?? 0,
      high: r.high ?? r.highPrice ?? 0,
      low: r.low ?? r.lowPrice ?? 0,
      close: r.close ?? r.closePrice ?? 0,
      volume: r.volume ?? r.totalVolume ?? 0,
    }));

    // Sort oldest-first (defensive — covers both KBS and VCI)
    mapped.sort((a: any, b: any) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tA - tB;
    });

    return mapped.slice(-30);
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
