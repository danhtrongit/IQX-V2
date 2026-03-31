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
    this.model = this.config.get<string>('AI_MODEL', 'gpt-5.2');
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
      this.logger.debug(`AI raw response (first 300 chars): ${raw.slice(0, 300)}`);
      allLayers = this.tryParseJson(raw);
      aiSuccess = !!allLayers.L1 && !allLayers.L1.error;
      if (!aiSuccess) {
        this.logger.warn(`AI parse result missing L1. Keys found: ${Object.keys(allLayers).join(', ')}, Raw[:200]: ${raw.slice(0, 200)}`);
      } else {
        this.logger.log(`AI response parsed successfully for ${upper}`);
      }
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
          { role: 'user', content: `QUAN TRỌNG: Chỉ trả về JSON hợp lệ, KHÔNG có text, KHÔNG có markdown. Bắt đầu bằng { và kết thúc bằng }\n\n${userMessage}` },
        ],
        temperature: 0.3,
        max_tokens: 65536,
        response_format: { type: 'json_object' },
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
    const ohlcv30 = d.ohlcv.slice(-30);
    const last10 = d.ohlcv.slice(-10);
    const last20 = d.ohlcv.slice(-20);
    const ma10 = last10.length ? last10.reduce((s, r) => s + r.close, 0) / last10.length : 0;
    const ma20 = last20.length ? last20.reduce((s, r) => s + r.close, 0) / last20.length : 0;
    const volMa10 = last10.length ? last10.reduce((s, r) => s + r.volume, 0) / last10.length : 0;
    const volMa20 = last20.length ? last20.reduce((s, r) => s + r.volume, 0) / last20.length : 0;
    const latestClose = d.ohlcv.length ? d.ohlcv[d.ohlcv.length - 1].close : 0;
    const latestVolume = d.ohlcv.length ? d.ohlcv[d.ohlcv.length - 1].volume : 0;

    const realtimeStr = d.realtime
      ? `Realtime: Giá hiện tại (P0)=${d.realtime.price}, Volume hiện tại (V0)=${d.realtime.volume}`
      : `Realtime (Chốt phiên mới nhất): P0=${latestClose.toFixed(2)}, V0=${latestVolume}`;

    parts.push(`\n## DỮ LIỆU CHO L1 (Xu hướng)`);
    parts.push(`${realtimeStr}. (Mẫu hình nến hiện tại: phân tích từ OHLCV)`);
    parts.push(`MA: MA10=${ma10.toFixed(2)}, MA20=${ma20.toFixed(2)}`);
    parts.push(`Vol_MA: VolMA10=${Math.round(volMa10)}, VolMA20=${Math.round(volMa20)}`);
    const ohlcvStr = ohlcv30.map(r => `${r.date}: O=${r.open} H=${r.high} L=${r.low} C=${r.close} V=${r.volume}`).join('\n');
    parts.push(`Lịch sử 30 phiên (OHLCV):\n${ohlcvStr}`);

    // L2 data — Supply/Demand
    parts.push(`\n## DỮ LIỆU CHO L2 (Thanh khoản)`);
    if (d.supplyDemand.length) {
      const sd30 = d.supplyDemand.slice(0, 30);
      const latest = sd30[0];
      const datLenh = (latest.buyTradeVolume || 0) + (latest.sellTradeVolume || 0);
      const chuaKhop = (latest.buyUnmatchedVolume || 0) + (latest.sellUnmatchedVolume || 0);
      const khop = latest.totalVolume || 0;

      const avgDatLenh = sd30.reduce((s, r) => s + ((r.buyTradeVolume || 0) + (r.sellTradeVolume || 0)), 0) / sd30.length;
      const avgChuaKhop = sd30.reduce((s, r) => s + ((r.buyUnmatchedVolume || 0) + (r.sellUnmatchedVolume || 0)), 0) / sd30.length;
      const avgKhop = sd30.reduce((s, r) => s + (r.totalVolume || 0), 0) / sd30.length;

      const getLabel = (val: number, avg: number) => {
        if (!avg) return 'không rõ';
        const ratio = val / avg;
        return ratio >= 1.3 ? 'cao' : ratio < 0.8 ? 'thấp' : 'bình thường';
      };

      parts.push(`Tổng KL đặt lệnh (mua+bán) mới nhất: ${datLenh} (Mức độ so với TB 30 phiên: ${getLabel(datLenh, avgDatLenh)})`);
      parts.push(`KL chưa khớp (mua+bán) mới nhất: ${chuaKhop} (Mức độ so với TB 30 phiên: ${getLabel(chuaKhop, avgChuaKhop)})`);
      parts.push(`Volume khớp lệnh mới nhất: ${khop} (Mức độ so với TB 30 phiên: ${getLabel(khop, avgKhop)})`);
    } else {
      parts.push('Không có dữ liệu cung cầu.');
    }

    // L3 data — Money Flow
    parts.push(`\n## DỮ LIỆU CHO L3 (Dòng tiền)`);
    parts.push(`Dữ liệu nền: OHLCV 30 phiên (như trên L1) + Volume/VolMA hiện tại để chuẩn hoá mức độ.`);
    
    parts.push(`\nNước ngoài (30 phiên gần nhất):`);
    parts.push(this.formatFlowData(d.foreignFlow));

    parts.push(`\nTự doanh (30 phiên gần nhất):`);
    parts.push(this.formatFlowData(d.proprietaryFlow));

    // L4 data — Insider
    parts.push(`\n## DỮ LIỆU CHO L4 (Nội bộ)`);
    if (d.insiderTransactions.length) {
      const ins30 = d.insiderTransactions.slice(0, 30);
      parts.push(`${ins30.length} thông báo gần nhất:`);
      const recent = ins30.map(r => 
        `${r.publicDate?.split('T')[0] || r.startDate?.split('T')[0] || ''} | Hành động: ${r.action} ` +
        `| Nắm giữ trước: ${r.shareBefore || 0} ` +
        `| KL thực hiện/đăng ký: ${r.shareExecuted || r.shareRegistered || 0} ` +
        `| Nắm giữ còn lại: ${r.shareAfter || 0}`
      ).join('\n');
      parts.push(recent);
    } else {
      parts.push('Không có giao dịch nội bộ trong dữ liệu trả về.');
    }

    // L5 data — News
    parts.push(`\n## DỮ LIỆU CHO L5 (Tin tức)`);
    if (d.tickerScore) {
      parts.push(`Điểm sentiment: ${d.tickerScore.score}/10 (Tích cực: ${d.tickerScore.countPositive}, Tiêu cực: ${d.tickerScore.countNegative})`);
    }
    const newsStr = d.news.map((n: any, i: number) => `${i + 1}. ${n.title} (${n.sourceName || ''}, ${n.updatedAt?.split(' ')[0] || ''})`).join('\n');
    parts.push(`Tin tức (${d.news.length} tin):\n${newsStr || 'Không có'}`);

    parts.push(`\nPhân tích tất cả 6 lớp, nhớ KHÔNG trả về markdown, chỉ return 1 JSON object hợp lệ chứa đầy đủ {"L1": ..., "L2": ..., "L6": ...}`);
    return parts.join('\n');
  }

  // helper method
  private formatFlowData(flow: any[]): string {
    if (!flow || !flow.length) return 'Không có dữ liệu.';
    const f30 = flow.slice(0, 30);
    const latest = f30[0];
    
    const sumNet = f30.reduce((s, r) => s + (r.totalNetVolume || 0), 0);
    const sumNetVal = f30.reduce((s, r) => s + (r.totalNetValue || 0), 0);
    const sumMatch = f30.reduce((s, r) => s + (r.matchNetVolume || 0), 0);
    const sumMatchVal = f30.reduce((s, r) => s + (r.matchNetValue || 0), 0);
    const sumDeal = f30.reduce((s, r) => s + (r.dealNetVolume || 0), 0);
    const sumDealVal = f30.reduce((s, r) => s + (r.dealNetValue || 0), 0);

    const ratio = (latest.totalVolume || 0) > 0 ? (latest.totalNetVolume || 0) / latest.totalVolume : 0;

    return `- KL ròng vs GT ròng (Mới nhất): Tổng= ${latest.totalNetVolume || 0} (${latest.totalNetValue || 0}đ) | Đặt lệnh(match)= ${latest.matchNetVolume || 0} (${latest.matchNetValue || 0}đ) | Thoả thuận(deal)= ${latest.dealNetVolume || 0} (${latest.dealNetValue || 0}đ)
- Lũy kế 30 phiên: Tổng= ${sumNet} (${sumNetVal}đ) | Đặt lệnh= ${sumMatch} (${sumMatchVal}đ) | Thoả thuận= ${sumDeal} (${sumDealVal}đ)
- KL ròng / volume hiện tại: ${(ratio * 100).toFixed(2)}%`;
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
      let cleaned = raw.trim();

      // Strip <think>...</think> reasoning tags (gpt-5.x / o-series models)
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // Strip markdown code fences (```json ... ``` or ``` ... ```)
      cleaned = cleaned.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

      // Find the outermost JSON object if there's leading text
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      }

      return JSON.parse(cleaned);
    } catch {
      return { text: raw };
    }
  }

  private avg(arr: any[], key: string): number {
    if (!arr.length) return 0;
    return arr.reduce((sum, r) => sum + (r[key] || 0), 0) / arr.length;
  }
}
