import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightDataCollector, InsightRawData } from './insight-data-collector.service';
import { LAYER_PROMPTS } from './prompts.constant';
import { MESSAGES } from '../../common/constants/messages.constant';

interface LayerResult {
  layer: string;
  output: any; // JSON object or string
}

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(
    private config: ConfigService,
    private dataCollector: InsightDataCollector,
  ) {
    this.baseUrl = this.config.get<string>('AI_BASE_URL', '');
    this.apiKey = this.config.get<string>('AI_API_KEY', '');
    this.model = this.config.get<string>('AI_MODEL', 'gpt-4o');
  }

  async analyze(symbol: string) {
    const upper = symbol.toUpperCase();
    this.logger.log(`Starting 6-layer analysis for ${upper}`);

    if (!this.apiKey || this.apiKey === 'your_v98dev_api_key_here') {
      return { message: 'AI_API_KEY chưa được cấu hình.', data: null };
    }

    const data = await this.dataCollector.collect(upper);
    this.logger.log(
      `Data collected: OHLCV=${data.ohlcv.length}, SD=${data.supplyDemand.length}, FF=${data.foreignFlow.length}, PF=${data.proprietaryFlow.length}, Insider=${data.insiderTransactions.length}, News=${data.news.length}`,
    );

    // Run L1-L5 in parallel
    const [l1, l2, l3, l4, l5] = await Promise.all([
      this.runLayer('L1', data),
      this.runLayer('L2', data),
      this.runLayer('L3', data),
      this.runLayer('L4', data),
      this.runLayer('L5', data),
    ]);

    // Run L6 with L1-L5 outputs
    const l6 = await this.runL6(l1, l2, l3, l4, l5);

    // Build rawInput for frontend detail panels
    const rawInput = this.buildRawInputs(data);

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        symbol: upper,
        timestamp: new Date().toISOString(),
        layers: {
          trend: { label: 'Xu hướng & Hỗ trợ/Kháng cự', output: l1.output },
          liquidity: { label: 'Thanh khoản & Cung–cầu', output: l2.output },
          moneyFlow: { label: 'Dòng tiền lớn', output: l3.output },
          insider: { label: 'Sự kiện nội bộ', output: l4.output },
          news: { label: 'Tin tức doanh nghiệp', output: l5.output },
          decision: { label: 'Tổng hợp & Hành động', output: l6.output },
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
  }

  // ── Chat Completion ──

  private async chatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
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
        max_tokens: 4000,
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

  // ── Layer Runners ──

  private async runLayer(layer: keyof typeof LAYER_PROMPTS, data: InsightRawData): Promise<LayerResult> {
    try {
      const systemPrompt = LAYER_PROMPTS[layer];
      const userInput = this.buildUserInput(layer, data);
      const raw = await this.chatCompletion(systemPrompt, userInput);
      const output = this.tryParseJson(raw);
      return { layer, output };
    } catch (err: any) {
      this.logger.error(`${layer} failed: ${err.message}`);
      return { layer, output: { error: err.message } };
    }
  }

  private async runL6(l1: LayerResult, l2: LayerResult, l3: LayerResult, l4: LayerResult, l5: LayerResult): Promise<LayerResult> {
    try {
      const systemPrompt = LAYER_PROMPTS.L6;
      const userInput = `Dưới đây là output JSON từ L1-L5. Hãy tổng hợp.

--- L1 (Xu hướng) ---
${JSON.stringify(l1.output)}

--- L2 (Thanh khoản) ---
${JSON.stringify(l2.output)}

--- L3 (Dòng tiền) ---
${JSON.stringify(l3.output)}

--- L4 (Nội bộ) ---
${JSON.stringify(l4.output)}

--- L5 (Tin tức) ---
${JSON.stringify(l5.output)}`;

      const raw = await this.chatCompletion(systemPrompt, userInput);
      const output = this.tryParseJson(raw);
      return { layer: 'L6', output };
    } catch (err: any) {
      this.logger.error(`L6 failed: ${err.message}`);
      return { layer: 'L6', output: { error: err.message } };
    }
  }

  // ── Build User Input ──

  private buildUserInput(layer: string, data: InsightRawData): string {
    switch (layer) {
      case 'L1': return this.buildL1Input(data);
      case 'L2': return this.buildL2Input(data);
      case 'L3': return this.buildL3Input(data);
      case 'L4': return this.buildL4Input(data);
      case 'L5': return this.buildL5Input(data);
      default: return '';
    }
  }

  private buildL1Input(d: InsightRawData): string {
    const last10 = d.ohlcv.slice(-10);
    const last20 = d.ohlcv.slice(-20);
    const ma10 = last10.length ? last10.reduce((s, r) => s + r.close, 0) / last10.length : 0;
    const ma20 = last20.length ? last20.reduce((s, r) => s + r.close, 0) / last20.length : 0;
    const volMa10 = last10.length ? last10.reduce((s, r) => s + r.volume, 0) / last10.length : 0;
    const volMa20 = last20.length ? last20.reduce((s, r) => s + r.volume, 0) / last20.length : 0;

    // MA20 slope (vs 5 sessions ago)
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

    const ohlcvStr = d.ohlcv.map(r =>
      `${r.date}: O=${r.open} H=${r.high} L=${r.low} C=${r.close} V=${r.volume}`
    ).join('\n');

    return `Mã: ${d.symbol}

## PRECOMPUTED
${realtimeStr}
MA10: ${ma10.toFixed(2)}, MA20: ${ma20.toFixed(2)}
VolMA10: ${Math.round(volMa10)}, VolMA20: ${Math.round(volMa20)}
Độ dốc MA20: ${ma20Slope} (${slopePct.toFixed(2)}%)
Khoảng cách giá-MA20: ${priceVsMa20.toFixed(2)}%
Giá quanh MA20: ${nearMa20 ? 'Có' : 'Không'}

## OHLCV 30 phiên
${ohlcvStr || 'Không có'}

Phân tích theo quy tắc, trả JSON.`;
  }

  private buildL2Input(d: InsightRawData): string {
    if (!d.supplyDemand.length) return `Mã: ${d.symbol}\nKhông có dữ liệu cung cầu.\nTrả JSON với giá trị "Chưa đủ dữ liệu".`;

    const latest = d.supplyDemand[0];
    const avg = (key: string) => this.avg(d.supplyDemand, key);

    return `Mã: ${d.symbol}

Phiên gần nhất (${latest.date}):
- KL chưa khớp: Mua=${latest.buyUnmatchedVolume}, Bán=${latest.sellUnmatchedVolume}
- Số lệnh: Mua=${latest.buyTradeCount}, Bán=${latest.sellTradeCount}
- KL đặt: Mua=${latest.buyTradeVolume}, Bán=${latest.sellTradeVolume}
- Volume khớp: ${latest.totalVolume}

TB30: KL chưa khớp Mua=${Math.round(avg('buyUnmatchedVolume'))}, Bán=${Math.round(avg('sellUnmatchedVolume'))}
TB30: Volume khớp=${Math.round(avg('totalVolume'))}

Phân tích, trả JSON.`;
  }

  private buildL3Input(d: InsightRawData): string {
    const summary = (arr: any[], label: string) => {
      if (!arr.length) return `${label}: Không có dữ liệu`;
      const buyDays = arr.filter(r => (r.matchNetVolume ?? r.totalNetVolume ?? 0) > 0).length;
      const totalNet = arr.reduce((s, r) => s + (r.totalNetVolume ?? r.matchNetVolume ?? 0), 0);
      return `${label}: ${buyDays}/${arr.length} phiên mua ròng, tổng ròng=${totalNet > 0 ? '+' : ''}${totalNet}`;
    };

    const priceChange = d.ohlcv.length >= 5
      ? ((d.ohlcv[d.ohlcv.length - 1].close - d.ohlcv[d.ohlcv.length - 5].close) / d.ohlcv[d.ohlcv.length - 5].close * 100).toFixed(2)
      : '0';

    const ffDetail = d.foreignFlow.slice(0, 10).map(r =>
      `${r.date}: ròng=${r.matchNetVolume ?? r.totalNetVolume ?? 0}`
    ).join('\n');

    const pfDetail = d.proprietaryFlow.slice(0, 10).map(r =>
      `${r.date}: ròng=${r.matchNetVolume ?? r.totalNetVolume ?? 0}`
    ).join('\n');

    return `Mã: ${d.symbol}
Hướng giá 5 phiên: ${priceChange}%

${summary(d.foreignFlow, 'Nước ngoài')}
10 phiên gần nhất:
${ffDetail || 'Không có'}

${summary(d.proprietaryFlow, 'Tự doanh')}
10 phiên gần nhất:
${pfDetail || 'Không có'}

Phân tích, trả JSON.`;
  }

  private buildL4Input(d: InsightRawData): string {
    if (!d.insiderTransactions.length) return `Mã: ${d.symbol}\nKhông có GD nội bộ.\nTrả JSON.`;

    const buys = d.insiderTransactions.filter(r => r.action?.includes('Mua') || r.action?.includes('mua'));
    const sells = d.insiderTransactions.filter(r => r.action?.includes('Bán') || r.action?.includes('bán'));

    const recent5 = d.insiderTransactions.slice(0, 5).map(r =>
      `${r.action} | KL=${r.shareExecuted || r.shareRegistered} | ${r.startDate?.split('T')[0] || ''}`
    ).join('\n');

    return `Mã: ${d.symbol}
Tổng: ${d.insiderTransactions.length} thông báo (Mua: ${buys.length}, Bán: ${sells.length})
5 gần nhất:
${recent5}

Phân tích, trả JSON.`;
  }

  private buildL5Input(d: InsightRawData): string {
    const newsStr = d.news.map((n: any, i: number) =>
      `${i + 1}. ${n.title} (${n.sourceName || ''}, ${n.updatedAt?.split(' ')[0] || ''})`
    ).join('\n');

    const scoreStr = d.tickerScore
      ? `Điểm AI: ${d.tickerScore.score}/10, Tích cực=${d.tickerScore.countPositive}, Tiêu cực=${d.tickerScore.countNegative}`
      : '';

    return `Mã: ${d.symbol}
${scoreStr}

Tin tức (${d.news.length} tin):
${newsStr || 'Không có'}

Tóm tắt từng tin, trả JSON.`;
  }

  // ── Build Raw Input for Frontend ──

  private buildRawInputs(data: InsightRawData) {
    const last10 = data.ohlcv.slice(-10);
    const last20 = data.ohlcv.slice(-20);
    const ma10 = last10.length ? +(last10.reduce((s, r) => s + r.close, 0) / last10.length).toFixed(2) : 0;
    const ma20 = last20.length ? +(last20.reduce((s, r) => s + r.close, 0) / last20.length).toFixed(2) : 0;
    const volMa10 = last10.length ? Math.round(last10.reduce((s, r) => s + r.volume, 0) / last10.length) : 0;
    const volMa20 = last20.length ? Math.round(last20.reduce((s, r) => s + r.volume, 0) / last20.length) : 0;
    const latestClose = data.ohlcv.length ? data.ohlcv[data.ohlcv.length - 1].close : 0;

    return {
      trend: {
        realtime: data.realtime,
        ohlcv: data.ohlcv,
        computed: { ma10, ma20, volMa10, volMa20, latestClose },
      },
      liquidity: {
        latest: data.supplyDemand[0] || null,
        avg30: data.supplyDemand.length ? {
          buyUnmatchedVolume: Math.round(this.avg(data.supplyDemand, 'buyUnmatchedVolume')),
          sellUnmatchedVolume: Math.round(this.avg(data.supplyDemand, 'sellUnmatchedVolume')),
          totalVolume: Math.round(this.avg(data.supplyDemand, 'totalVolume')),
        } : null,
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
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
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
