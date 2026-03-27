import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InsightDataCollector,
  InsightRawData,
} from './insight-data-collector.service';
import { COMBINED_PROMPT } from './prompts.constant';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';



@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(
    private config: ConfigService,
    private dataCollector: InsightDataCollector,
    private cacheService: RedisCacheService,
  ) {
    this.baseUrl = this.config.get<string>('AI_BASE_URL', '');
    this.apiKey = this.config.get<string>('AI_API_KEY', '');
    this.model = this.config.get<string>('AI_MODEL', 'gemini-3.1-pro-preview');
  }

  async analyze(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `ai-insight:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.AI_INSIGHT);
      if (cached) {
        this.logger.debug(`Cache HIT for AI insight: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for AI insight: ${error.message}`);
    }

    this.logger.log(`Starting single-request 6-layer analysis for ${upper}`);

    if (!this.apiKey || this.apiKey === 'your_v98dev_api_key_here') {
      return { message: 'AI_API_KEY chưa được cấu hình.', data: null };
    }

    const data = await this.dataCollector.collect(upper);
    this.logger.log(
      `Data collected: OHLCV=${data.ohlcv.length}, SD=${data.supplyDemand.length}, FF=${data.foreignFlow.length}, PF=${data.proprietaryFlow.length}, Insider=${data.insiderTransactions.length}, News=${data.news.length}`,
    );

    // Single AI call for all 6 layers
    let allLayers: Record<string, any> = {};
    let aiSuccess = false;
    try {
      const userInput = this.buildCombinedInput(data);
      const raw = await this.chatCompletion(COMBINED_PROMPT, userInput);
      allLayers = this.tryParseJson(raw);
      aiSuccess = !!allLayers.L1 && !allLayers.L1.error;
      this.logger.log(`AI response parsed successfully for ${upper}`);
    } catch (err: any) {
      this.logger.error(`AI analysis failed: ${err.message}`);
      allLayers = {
        L1: { error: err.message },
        L2: { error: err.message },
        L3: { error: err.message },
        L4: { error: err.message },
        L5: { error: err.message },
        L6: { error: err.message },
      };
    }

    const rawInput = this.buildRawInputs(data);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        symbol: upper,
        timestamp: new Date().toISOString(),
        layers: {
          trend: { label: 'Xu hướng & Hỗ trợ/Kháng cự', output: allLayers.L1 || {} },
          liquidity: { label: 'Thanh khoản & Cung–cầu', output: allLayers.L2 || {} },
          moneyFlow: { label: 'Dòng tiền lớn', output: allLayers.L3 || {} },
          insider: { label: 'Sự kiện nội bộ', output: allLayers.L4 || {} },
          news: { label: 'Tin tức doanh nghiệp', output: allLayers.L5 || {} },
          decision: { label: 'Tổng hợp & Hành động', output: allLayers.L6 || {} },
        },
        rawInput,
        dataSummary: {
          ohlcvDays: data.ohlcv.length,
          supplyDemandDays: data.supplyDemand.length,
          foreignFlowDays: data.foreignFlow.length,
          proprietaryFlowDays: data.proprietaryFlow.length,
          insiderRecords: data.insiderTransactions.length,
          newsCount: data.news.length,
          hasTickerScore: !!data.tickerScore,
          hasRealtime: !!data.realtime,
        },
      },
    };

    // Only cache successful responses
    if (aiSuccess) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.AI_INSIGHT);
      } catch (error) {
        this.logger.warn(`Cache set failed for AI insight: ${error.message}`);
      }
    }

    return response;
  }

  // ── Chat Completion ──

  private async chatCompletion(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 65536,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI response empty');
    return content.trim();
  }

  // ── Build Combined Input (all data for single request) ──

  private buildCombinedInput(d: InsightRawData): string {
    const parts: string[] = [];
    parts.push(`Mã: ${d.symbol}`);

    // L1 data — OHLCV & Precomputed
    const last10 = d.ohlcv.slice(-10);
    const last20 = d.ohlcv.slice(-20);
    const ma10 = last10.length ? last10.reduce((s, r) => s + r.close, 0) / last10.length : 0;
    const ma20 = last20.length ? last20.reduce((s, r) => s + r.close, 0) / last20.length : 0;
    const volMa10 = last10.length ? last10.reduce((s, r) => s + r.volume, 0) / last10.length : 0;
    const volMa20 = last20.length ? last20.reduce((s, r) => s + r.volume, 0) / last20.length : 0;
    const prev5 = d.ohlcv.slice(-25, -20);
    const ma20_5ago = prev5.length >= 5
      ? d.ohlcv.slice(-25).slice(0, 20).reduce((s, r) => s + r.close, 0) / 20
      : ma20;
    const slopePct = ma20 ? ((ma20 - ma20_5ago) / ma20_5ago) * 100 : 0;
    const ma20Slope = slopePct >= 0.3 ? 'đi lên' : slopePct <= -0.3 ? 'đi xuống' : 'phẳng';
    const latestClose = d.ohlcv.length ? d.ohlcv[d.ohlcv.length - 1].close : 0;
    const priceVsMa20 = ma20 ? ((latestClose - ma20) / ma20) * 100 : 0;
    const nearMa20 = Math.abs(priceVsMa20) <= 1.5;

    const realtimeStr = d.realtime
      ? `Giá hiện tại: ${d.realtime.price}, Volume: ${d.realtime.volume}`
      : `Giá đóng cửa gần nhất: ${latestClose.toFixed(2)}`;

    parts.push(`\n## DỮ LIỆU CHO L1 (Xu hướng)`);
    parts.push(realtimeStr);
    parts.push(`MA10: ${ma10.toFixed(2)}, MA20: ${ma20.toFixed(2)}`);
    parts.push(`VolMA10: ${Math.round(volMa10)}, VolMA20: ${Math.round(volMa20)}`);
    parts.push(`Độ dốc MA20: ${ma20Slope} (${slopePct.toFixed(2)}%)`);
    parts.push(`Khoảng cách giá-MA20: ${priceVsMa20.toFixed(2)}%`);
    parts.push(`Giá quanh MA20: ${nearMa20 ? 'Có' : 'Không'}`);
    const ohlcvStr = d.ohlcv.slice(-10).map(r => `${r.date}: O=${r.open} H=${r.high} L=${r.low} C=${r.close} V=${r.volume}`).join('\n');
    parts.push(`OHLCV 10 phiên gần nhất:\n${ohlcvStr || 'Không có'}`);

    // L2 data — Supply/Demand
    parts.push(`\n## DỮ LIỆU CHO L2 (Thanh khoản)`);
    if (d.supplyDemand.length) {
      const latest = d.supplyDemand[0];
      parts.push(`Phiên gần nhất (${latest.date}): KL chưa khớp Mua=${latest.buyUnmatchedVolume}, Bán=${latest.sellUnmatchedVolume}, Lệnh Mua=${latest.buyTradeCount}, Bán=${latest.sellTradeCount}, Volume khớp=${latest.totalVolume}`);
      parts.push(`TB30: Volume khớp=${Math.round(this.avg(d.supplyDemand, 'totalVolume'))}`);
    } else {
      parts.push('Không có dữ liệu cung cầu.');
    }

    // L3 data — Money Flow
    parts.push(`\n## DỮ LIỆU CHO L3 (Dòng tiền)`);
    const priceChange = d.ohlcv.length >= 5
      ? ((d.ohlcv[d.ohlcv.length - 1].close - d.ohlcv[d.ohlcv.length - 5].close) / d.ohlcv[d.ohlcv.length - 5].close * 100).toFixed(2)
      : '0';
    parts.push(`Hướng giá 5 phiên: ${priceChange}%`);
    const ffSummary = this.flowSummary(d.foreignFlow, 'Nước ngoài');
    const pfSummary = this.flowSummary(d.proprietaryFlow, 'Tự doanh');
    parts.push(ffSummary);
    parts.push(pfSummary);

    // L4 data — Insider
    parts.push(`\n## DỮ LIỆU CHO L4 (Nội bộ)`);
    if (d.insiderTransactions.length) {
      const buys = d.insiderTransactions.filter(r => r.action?.includes('Mua') || r.action?.includes('mua'));
      const sells = d.insiderTransactions.filter(r => r.action?.includes('Bán') || r.action?.includes('bán'));
      parts.push(`Tổng: ${d.insiderTransactions.length} thông báo (Mua: ${buys.length}, Bán: ${sells.length})`);
      const recent = d.insiderTransactions.slice(0, 5).map(r => `${r.action} | KL=${r.shareExecuted || r.shareRegistered} | ${r.startDate?.split('T')[0] || ''}`).join('\n');
      parts.push(`5 gần nhất:\n${recent}`);
    } else {
      parts.push('Không có GD nội bộ.');
    }

    // L5 data — News
    parts.push(`\n## DỮ LIỆU CHO L5 (Tin tức)`);
    if (d.tickerScore) {
      parts.push(`Điểm AI: ${d.tickerScore.score}/10, Tích cực=${d.tickerScore.countPositive}, Tiêu cực=${d.tickerScore.countNegative}`);
    }
    const newsStr = d.news.map((n: any, i: number) => `${i + 1}. ${n.title} (${n.sourceName || ''}, ${n.updatedAt?.split(' ')[0] || ''})`).join('\n');
    parts.push(`Tin tức (${d.news.length} tin):\n${newsStr || 'Không có'}`);

    parts.push(`\nPhân tích tất cả 6 lớp, trả 1 JSON duy nhất theo format đã yêu cầu.`);
    return parts.join('\n');
  }

  private flowSummary(arr: any[], label: string): string {
    if (!arr.length) return `${label}: Không có dữ liệu`;
    const buyDays = arr.filter(r => (r.matchNetVolume ?? r.totalNetVolume ?? 0) > 0).length;
    const totalNet = arr.reduce((s, r) => s + (r.totalNetVolume ?? r.matchNetVolume ?? 0), 0);
    const detail = arr.slice(0, 5).map(r => `${r.date}: ròng=${r.matchNetVolume ?? r.totalNetVolume ?? 0}`).join(', ');
    return `${label}: ${buyDays}/${arr.length} phiên mua ròng, tổng ròng=${totalNet > 0 ? '+' : ''}${totalNet}. Gần nhất: ${detail}`;  
  }



  // ── Build Raw Input for Frontend ──

  private buildRawInputs(data: InsightRawData) {
    const last10 = data.ohlcv.slice(-10);
    const last20 = data.ohlcv.slice(-20);
    const ma10 = last10.length
      ? +(last10.reduce((s, r) => s + r.close, 0) / last10.length).toFixed(2)
      : 0;
    const ma20 = last20.length
      ? +(last20.reduce((s, r) => s + r.close, 0) / last20.length).toFixed(2)
      : 0;
    const volMa10 = last10.length
      ? Math.round(last10.reduce((s, r) => s + r.volume, 0) / last10.length)
      : 0;
    const volMa20 = last20.length
      ? Math.round(last20.reduce((s, r) => s + r.volume, 0) / last20.length)
      : 0;
    const latestClose = data.ohlcv.length
      ? data.ohlcv[data.ohlcv.length - 1].close
      : 0;

    return {
      trend: {
        realtime: data.realtime,
        ohlcv: data.ohlcv,
        computed: { ma10, ma20, volMa10, volMa20, latestClose },
      },
      liquidity: {
        latest: data.supplyDemand[0] || null,
        avg30: data.supplyDemand.length
          ? {
              buyUnmatchedVolume: Math.round(
                this.avg(data.supplyDemand, 'buyUnmatchedVolume'),
              ),
              sellUnmatchedVolume: Math.round(
                this.avg(data.supplyDemand, 'sellUnmatchedVolume'),
              ),
              totalVolume: Math.round(
                this.avg(data.supplyDemand, 'totalVolume'),
              ),
            }
          : null,
        history: data.supplyDemand.slice(0, 10),
      },
      moneyFlow: {
        foreign: data.foreignFlow.slice(0, 15),
        proprietary: data.proprietaryFlow.slice(0, 15),
      },
      insider: {
        transactions: data.insiderTransactions,
      },
      news: {
        items: data.news,
        tickerScore: data.tickerScore,
      },
    };
  }

  // ── Helpers ──

  private tryParseJson(raw: string): any {
    try {
      // Strip markdown code fences if present
      let cleaned = raw;
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, '');
      }
      return JSON.parse(cleaned);
    } catch {
      // Return as plain text if JSON parse fails
      return { text: raw };
    }
  }

  private avg(arr: any[], key: string): number {
    if (!arr.length) return 0;
    return arr.reduce((sum, r) => sum + (r[key] || 0), 0) / arr.length;
  }
}
