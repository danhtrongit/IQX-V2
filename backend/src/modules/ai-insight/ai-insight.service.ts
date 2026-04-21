import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InsightDataCollector,
  InsightRawData,
} from './insight-data-collector.service';
import { LAYER_PROMPTS } from './prompts.constant';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

const PRIMARY_LAYER_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
const ALL_LAYER_KEYS = [...PRIMARY_LAYER_KEYS, 'L6'] as const;

type PrimaryLayerKey = (typeof PRIMARY_LAYER_KEYS)[number];
type LayerKey = (typeof ALL_LAYER_KEYS)[number];

type LayerRequestOptions = {
  maxOutputTokens?: number;
};

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
    this.model = this.config.get<string>('AI_MODEL', 'gpt-5.4');
  }

  async analyze(symbol: string) {
    const upper = symbol.toUpperCase();
    const cacheKey = `ai-insight:${upper}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.AI_INSIGHT,
      );
      if (cached) {
        this.logger.debug(`Cache HIT for AI insight: ${upper}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for AI insight: ${error.message}`);
    }

    this.logger.log(`Starting parallel 6-layer analysis for ${upper}`);

    if (!this.apiKey || this.apiKey === 'your_v98dev_api_key_here') {
      return { message: 'AI_API_KEY chưa được cấu hình.', data: null };
    }

    const data = await this.dataCollector.collect(upper);
    this.logger.log(
      `Data collected: OHLCV=${data.ohlcv.length}, SD=${data.supplyDemand.length}, FF=${data.foreignFlow.length}, PF=${data.proprietaryFlow.length}, Insider=${data.insiderTransactions.length}, News=${data.news.length}`,
    );

    let allLayers: Record<LayerKey, any> = this.buildLayerErrorMap(
      'AI analysis failed before execution.',
    );
    let aiSuccess = false;
    try {
      const layerInputs = this.buildParallelLayerInputs(data);
      const parallelStartedAt = Date.now();
      const primaryLayerEntries = await Promise.all(
        PRIMARY_LAYER_KEYS.map(async (layerKey) => {
          const output = await this.runLayer(layerKey, layerInputs[layerKey]);
          return [layerKey, output] as const;
        }),
      );

      allLayers = {
        ...(Object.fromEntries(primaryLayerEntries) as Record<
          PrimaryLayerKey,
          any
        >),
        L6: {},
      };

      this.logger.log(
        `Parallel layers L1-L5 completed for ${upper} in ${Date.now() - parallelStartedAt}ms`,
      );

      const decisionStartedAt = Date.now();
      const decisionInput = this.buildDecisionInput(upper, allLayers);
      const decisionOutput = await this.runLayer('L6', decisionInput);
      allLayers.L6 = this.isLayerError(decisionOutput)
        ? this.buildDecisionLayer(upper, allLayers)
        : decisionOutput;
      this.logger.debug(`L6 finished in ${Date.now() - decisionStartedAt}ms`);

      aiSuccess = ALL_LAYER_KEYS.every(
        (layerKey) => !this.isLayerError(allLayers[layerKey]),
      );
      if (!aiSuccess) {
        const failedLayers = ALL_LAYER_KEYS.filter((layerKey) =>
          this.isLayerError(allLayers[layerKey]),
        ).join(', ');
        this.logger.warn(
          `AI analysis completed with layer errors for ${upper}: ${failedLayers}`,
        );
      } else {
        this.logger.log(`AI response parsed successfully for ${upper}`);
      }
    } catch (err: any) {
      this.logger.error(`AI analysis failed: ${err.message}`);
      allLayers = this.buildLayerErrorMap(err.message);
    }

    const rawInput = this.buildRawInputs(data);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        symbol: upper,
        timestamp: new Date().toISOString(),
        layers: {
          trend: {
            label: 'Xu hướng & Hỗ trợ/Kháng cự',
            output: allLayers.L1 || {},
          },
          liquidity: {
            label: 'Thanh khoản & Cung–cầu',
            output: allLayers.L2 || {},
          },
          moneyFlow: { label: 'Dòng tiền lớn', output: allLayers.L3 || {} },
          insider: { label: 'Sự kiện nội bộ', output: allLayers.L4 || {} },
          news: { label: 'Tin tức doanh nghiệp', output: allLayers.L5 || {} },
          decision: {
            label: 'Tổng hợp & Hành động',
            output: allLayers.L6 || {},
          },
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

  private async runLayer(
    layerKey: LayerKey,
    userInput: string,
  ): Promise<Record<string, any>> {
    const startedAt = Date.now();

    try {
      const raw = await this.chatCompletion(
        LAYER_PROMPTS[layerKey],
        userInput,
        this.getLayerRequestOptions(layerKey),
      );
      const parsed = this.tryParseJson(raw);

      if (parsed?.text && Object.keys(parsed).length === 1) {
        throw new Error(`Invalid JSON from ${layerKey}: ${raw.slice(0, 200)}`);
      }

      return this.normalizeLayerOutput(layerKey, parsed);
    } catch (error: any) {
      this.logger.warn(
        `${layerKey} failed after ${Date.now() - startedAt}ms: ${error.message}`,
      );
      return { error: error.message };
    } finally {
      this.logger.debug(`${layerKey} finished in ${Date.now() - startedAt}ms`);
    }
  }

  private getLayerRequestOptions(layerKey: LayerKey): LayerRequestOptions {
    switch (layerKey) {
      case 'L1':
        return { maxOutputTokens: 320 };
      case 'L2':
        return { maxOutputTokens: 220 };
      case 'L3':
        return { maxOutputTokens: 240 };
      case 'L4':
        return { maxOutputTokens: 180 };
      case 'L5':
        return { maxOutputTokens: 320 };
      case 'L6':
        return { maxOutputTokens: 420 };
      default:
        return {};
    }
  }

  private normalizeLayerOutput(
    layerKey: LayerKey,
    payload: Record<string, any>,
  ): Record<string, any> {
    if (layerKey !== 'L4') {
      return payload;
    }

    return {
      'Nội bộ': payload['Nội bộ'] ?? payload.insider ?? 'Chưa đủ dữ liệu',
      'Mức cảnh báo':
        payload['Mức cảnh báo'] ?? payload.impactLevel ?? 'Chưa đủ dữ liệu',
      ...(payload['Ghi chú'] ? { 'Ghi chú': payload['Ghi chú'] } : {}),
    };
  }

  private buildLayerErrorMap(message: string): Record<LayerKey, any> {
    return Object.fromEntries(
      ALL_LAYER_KEYS.map((layerKey) => [layerKey, { error: message }]),
    ) as Record<LayerKey, any>;
  }

  private isLayerError(layerOutput: any): boolean {
    return (
      !layerOutput || typeof layerOutput !== 'object' || !!layerOutput.error
    );
  }

  // ── Responses API ──

  private async chatCompletion(
    systemPrompt: string,
    userMessage: string,
    options: LayerRequestOptions = {},
  ): Promise<string> {
    const res = await fetch(this.resolveResponsesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `QUAN TRỌNG: Chỉ trả về JSON hợp lệ, KHÔNG có text, KHÔNG có markdown. Bắt đầu bằng { và kết thúc bằng }\n\n${userMessage}`,
              },
            ],
          },
        ],
        stream: true,
        temperature: 0.3,
        max_output_tokens: options.maxOutputTokens ?? 65536,
        text: {
          format: { type: 'json_object' },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    return this.readResponsesStream(res);
  }

  private resolveResponsesUrl(): string {
    const trimmed = this.baseUrl.trim().replace(/\/+$/, '');

    if (!trimmed) {
      throw new Error('AI_BASE_URL chưa được cấu hình.');
    }

    if (trimmed.endsWith('/responses')) {
      return trimmed;
    }

    if (trimmed.endsWith('/chat/completions')) {
      return `${trimmed.slice(0, -'/chat/completions'.length)}/responses`;
    }

    return `${trimmed}/responses`;
  }

  private async readResponsesStream(res: Response): Promise<string> {
    if (!res.body) {
      throw new Error('AI response stream missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let collectedText = '';
    let finalText = '';
    let rawPreview = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      rawPreview = (rawPreview + chunk).slice(-4000);

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const event of events) {
        const parsed = this.parseSseEvent(event);
        if (!parsed) continue;

        if (parsed.type === 'response.output_text.delta') {
          collectedText += parsed.delta || '';
        }

        if (parsed.type === 'response.output_text.done' && parsed.text) {
          finalText = parsed.text;
        }

        if (parsed.type === 'error') {
          const message = parsed.error?.message || JSON.stringify(parsed.error);
          throw new Error(`AI stream error: ${message}`);
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      rawPreview = (rawPreview + buffer).slice(-4000);
      const parsed = this.parseSseEvent(buffer);
      if (parsed?.type === 'response.output_text.done' && parsed.text) {
        finalText = parsed.text;
      }
    }

    const text = (collectedText || finalText).trim();
    if (text) {
      return text;
    }

    throw new Error(`AI response empty: ${rawPreview.slice(-400)}`);
  }

  private parseSseEvent(rawEvent: string): any | null {
    const lines = rawEvent
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);

    if (!lines.length) {
      return null;
    }

    const dataLines = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim());

    if (!dataLines.length) {
      return null;
    }

    const data = dataLines.join('\n');
    if (data === '[DONE]') {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // ── Build Layer Inputs ──

  private buildParallelLayerInputs(
    data: InsightRawData,
  ): Record<PrimaryLayerKey, string> {
    const header = `Mã: ${data.symbol}`;
    const footer = this.buildJsonOnlyFooter();

    return {
      L1: [header, this.buildTrendSection(data), footer].join('\n'),
      L2: [header, this.buildLiquiditySection(data), footer].join('\n'),
      L3: [header, this.buildMoneyFlowSection(data), footer].join('\n'),
      L4: [header, this.buildInsiderSection(data), footer].join('\n'),
      L5: [header, this.buildNewsSection(data), footer].join('\n'),
    };
  }

  private buildDecisionInput(
    symbol: string,
    layers: Record<string, any>,
  ): string {
    const summarizedLayers = Object.fromEntries(
      PRIMARY_LAYER_KEYS.map((layerKey) => [
        layerKey,
        this.isLayerError(layers[layerKey])
          ? { 'Ghi chú': 'Chưa đủ dữ liệu ở lớp này.' }
          : this.extractDecisionSummary(layerKey, layers[layerKey]),
      ]),
    );

    return [
      `Mã: ${symbol}`,
      'KẾT QUẢ L1-L5 (JSON RÚT GỌN):',
      JSON.stringify(summarizedLayers, null, 2),
      this.buildJsonOnlyFooter(),
    ].join('\n');
  }

  private buildDecisionLayer(
    symbol: string,
    layers: Record<LayerKey, any>,
  ): Record<string, any> {
    const trendText = this.asText(layers.L1?.['Xu hướng']);
    const stateText = this.asText(layers.L1?.['Trạng thái']);
    const supportText = this.asText(layers.L1?.['Hỗ trợ']);
    const resistanceText = this.asText(layers.L1?.['Kháng cự']);

    const liquidityText = this.asText(layers.L2?.['Thanh khoản']);
    const liquidityImpact = this.asText(layers.L2?.['Tác động']);
    const supplyDemandText = this.asText(layers.L2?.['Cung - Cầu']);

    const foreignText = this.asText(layers.L3?.['Khối ngoại']);
    const proprietaryText = this.asText(layers.L3?.['Tự doanh']);
    const moneyImpact = this.asText(layers.L3?.['Tác động']);

    const insiderText = this.asText(layers.L4?.['Nội bộ']);
    const insiderAlert = this.asText(layers.L4?.['Mức cảnh báo']);

    const newsOverview = this.asText(layers.L5?.['Tổng quan']);
    const newsImpact = this.asText(layers.L5?.['Tác động']);

    const score =
      this.scoreTrend(trendText, stateText) +
      this.scoreLiquidity(liquidityText, supplyDemandText, liquidityImpact) +
      this.scoreMoneyFlow(foreignText, proprietaryText, moneyImpact) +
      this.scoreInsider(insiderText, insiderAlert) +
      this.scoreNews(newsOverview, newsImpact);

    let action = 'Quan sát';
    if (score >= 4) action = 'Mua';
    else if (score >= 1) action = 'Giữ';
    else if (score <= -2) action = 'Giảm tỷ trọng';

    if (
      this.containsAny(trendText, ['giảm']) &&
      this.containsAny(liquidityText, ['suy yếu'])
    ) {
      action = 'Giảm tỷ trọng';
    }

    const positiveFactors = [
      this.pickFactor('xu hướng', trendText, ['tăng']),
      this.pickFactor('thanh khoản', liquidityText, ['cải thiện']),
      this.pickFactor(
        'dòng tiền',
        `${foreignText} ${proprietaryText} ${moneyImpact}`,
        ['mua ròng', 'ủng hộ'],
      ),
      this.pickFactor('nội bộ', `${insiderText} ${insiderAlert}`, [
        'mua',
        'hỗ trợ',
      ]),
      this.pickFactor('tin tức', `${newsOverview} ${newsImpact}`, [
        'tích cực',
        'hỗ trợ',
      ]),
    ].filter(Boolean);

    const riskFactors = [
      this.pickFactor('xu hướng', `${trendText} ${stateText}`, [
        'giảm',
        'yếu',
        'giằng co',
      ]),
      this.pickFactor('thanh khoản', `${liquidityText} ${supplyDemandText}`, [
        'suy yếu',
        'kẹt lệnh',
      ]),
      this.pickFactor(
        'dòng tiền',
        `${foreignText} ${proprietaryText} ${moneyImpact}`,
        ['bán ròng', 'cảnh báo'],
      ),
      this.pickFactor('nội bộ', `${insiderText} ${insiderAlert}`, [
        'bán',
        'thận trọng',
      ]),
      this.pickFactor('tin tức', `${newsOverview} ${newsImpact}`, [
        'tiêu cực',
        'áp lực',
      ]),
    ].filter(Boolean);

    const overview = positiveFactors.length
      ? `${symbol} đang có thiên hướng ${action.toLowerCase()} nhờ ${positiveFactors.slice(0, 2).join(' và ')}.`
      : `${symbol} chưa có đủ đồng thuận rõ giữa các lớp phân tích, ưu tiên ${action.toLowerCase()}.`;

    const riskSentence = riskFactors.length
      ? `Rủi ro chính đến từ ${riskFactors.slice(0, 2).join(' và ')}.`
      : 'Rủi ro ngắn hạn hiện chưa nổi bật nhưng vẫn cần theo dõi phản ứng giá.';

    const favorableCondition = supportText
      ? `Giá giữ được vùng ${supportText} và cải thiện lực cầu để hướng lên ${resistanceText || 'vùng cản gần'}.`
      : 'Giá duy trì trên vùng hỗ trợ gần và dòng tiền tiếp tục ủng hộ để mở rộng đà tăng.';
    const adverseCondition = supportText
      ? `Nếu thủng ${supportText} kèm thanh khoản xấu đi thì áp lực điều chỉnh sẽ tăng nhanh.`
      : 'Nếu mất vùng cân bằng hiện tại kèm dòng tiền suy yếu thì áp lực điều chỉnh sẽ tăng.';
    const sidewaysCondition =
      supportText || resistanceText
        ? `Khả năng cao giá tiếp tục dao động giữa ${supportText || 'hỗ trợ gần'} và ${resistanceText || 'kháng cự gần'}, cần tránh mua đuổi.`
        : 'Nếu chưa có chất xúc tác mới, cổ phiếu dễ đi ngang và gây nhiễu tín hiệu ngắn hạn.';

    return {
      'Tổng quan': `${overview} ${riskSentence}`.trim(),
      'Thanh khoản': liquidityText || 'Chưa đủ dữ liệu',
      'Dòng tiền':
        [foreignText, proprietaryText, moneyImpact]
          .filter(Boolean)
          .join(' | ') || 'Chưa đủ dữ liệu',
      'Giao dịch nội bộ':
        [insiderText, insiderAlert].filter(Boolean).join(' | ') ||
        'Chưa đủ dữ liệu',
      'Tin tức':
        [newsOverview, newsImpact].filter(Boolean).join(' | ') ||
        'Chưa đủ dữ liệu',
      'Hành động chính': `${action} + ${this.buildActionReason(action, positiveFactors, riskFactors)}`,
      'Kịch bản thuận lợi': favorableCondition,
      'Kịch bản bất lợi': adverseCondition,
      'Kịch bản đi ngang': sidewaysCondition,
    };
  }

  private extractDecisionSummary(
    layerKey: PrimaryLayerKey,
    payload: Record<string, any>,
  ): Record<string, any> {
    switch (layerKey) {
      case 'L1':
        return {
          'Xu hướng': payload['Xu hướng'],
          'Trạng thái': payload['Trạng thái'],
          'Hỗ trợ': payload['Hỗ trợ'],
          'Kháng cự': payload['Kháng cự'],
        };
      case 'L2':
        return {
          'Thanh khoản': payload['Thanh khoản'],
          'Cung - Cầu': payload['Cung - Cầu'],
          'Tác động': payload['Tác động'],
        };
      case 'L3':
        return {
          'Khối ngoại': payload['Khối ngoại'],
          'Tự doanh': payload['Tự doanh'],
          'Tác động': payload['Tác động'],
        };
      case 'L4':
        return {
          'Nội bộ': payload['Nội bộ'],
          'Mức cảnh báo': payload['Mức cảnh báo'],
        };
      case 'L5':
        return {
          'Tổng quan': payload['Tổng quan'],
          'Tác động': payload['Tác động'],
          'Tin tức': Array.isArray(payload['Tin tức'])
            ? payload['Tin tức'].slice(0, 3)
            : payload['Tin tức'],
        };
      default:
        return payload;
    }
  }

  private buildJsonOnlyFooter(): string {
    return `\nLƯU Ý CỰC QUAN TRỌNG:
1. KHÔNG trả về markdown, chỉ return 1 JSON object.
2. BẮT BUỘC giữ nguyên các KEY TIẾNG VIỆT đã định nghĩa (VD: "Xu hướng", "Trạng thái", "Thanh khoản", "Hành động chính"). TUYỆT ĐỐI KHÔNG DỊCH KEY SANG TIẾNG ANH (như trend, signal, analysis).`;
  }

  private buildTrendSection(d: InsightRawData): string {
    const { ohlcv30, ma10, ma20, volMa10, volMa20, realtimeStr } =
      this.getTrendMetrics(d);
    const ohlcvStr = ohlcv30
      .map(
        (r) =>
          `${r.date}: O=${r.open} H=${r.high} L=${r.low} C=${r.close} V=${r.volume}`,
      )
      .join('\n');

    return [
      '## DỮ LIỆU CHO L1 (Xu hướng)',
      `${realtimeStr}. (Mẫu hình nến hiện tại: phân tích từ OHLCV)`,
      `MA: MA10=${ma10.toFixed(2)}, MA20=${ma20.toFixed(2)}`,
      `Vol_MA: VolMA10=${Math.round(volMa10)}, VolMA20=${Math.round(volMa20)}`,
      `Lịch sử 30 phiên (OHLCV):\n${ohlcvStr}`,
    ].join('\n');
  }

  private buildLiquiditySection(d: InsightRawData): string {
    const parts = ['## DỮ LIỆU CHO L2 (Thanh khoản)'];

    if (!d.supplyDemand.length) {
      parts.push('Không có dữ liệu cung cầu.');
      return parts.join('\n');
    }

    const sd30 = d.supplyDemand.slice(0, 30);
    const latest = sd30[0];
    const datLenh =
      (latest.buyTradeVolume || 0) + (latest.sellTradeVolume || 0);
    const chuaKhop =
      (latest.buyUnmatchedVolume || 0) + (latest.sellUnmatchedVolume || 0);
    const khop = latest.totalVolume || 0;

    const avgDatLenh =
      sd30.reduce(
        (s, r) => s + ((r.buyTradeVolume || 0) + (r.sellTradeVolume || 0)),
        0,
      ) / sd30.length;
    const avgChuaKhop =
      sd30.reduce(
        (s, r) =>
          s + ((r.buyUnmatchedVolume || 0) + (r.sellUnmatchedVolume || 0)),
        0,
      ) / sd30.length;
    const avgKhop =
      sd30.reduce((s, r) => s + (r.totalVolume || 0), 0) / sd30.length;

    const getLabel = (val: number, avg: number) => {
      if (!avg) return 'không rõ';
      const ratio = val / avg;
      return ratio >= 1.3 ? 'cao' : ratio < 0.8 ? 'thấp' : 'bình thường';
    };

    parts.push(
      `Tổng KL đặt lệnh (mua+bán) mới nhất: ${datLenh} (Mức độ so với TB 30 phiên: ${getLabel(datLenh, avgDatLenh)})`,
    );
    parts.push(
      `KL chưa khớp (mua+bán) mới nhất: ${chuaKhop} (Mức độ so với TB 30 phiên: ${getLabel(chuaKhop, avgChuaKhop)})`,
    );
    parts.push(
      `Volume khớp lệnh mới nhất: ${khop} (Mức độ so với TB 30 phiên: ${getLabel(khop, avgKhop)})`,
    );

    return parts.join('\n');
  }

  private buildMoneyFlowSection(d: InsightRawData): string {
    const { ma10, ma20, volMa10, volMa20, realtimeStr } =
      this.getTrendMetrics(d);

    return [
      '## DỮ LIỆU CHO L3 (Dòng tiền)',
      `Bối cảnh giá/volume hiện tại: ${realtimeStr}. MA10=${ma10.toFixed(2)}, MA20=${ma20.toFixed(2)}, VolMA10=${Math.round(volMa10)}, VolMA20=${Math.round(volMa20)}`,
      '\nNước ngoài (30 phiên gần nhất):',
      this.formatFlowData(d.foreignFlow),
      '\nTự doanh (30 phiên gần nhất):',
      this.formatFlowData(d.proprietaryFlow),
    ].join('\n');
  }

  private buildInsiderSection(d: InsightRawData): string {
    const parts = ['## DỮ LIỆU CHO L4 (Nội bộ)'];

    if (!d.insiderTransactions.length) {
      parts.push('Không có giao dịch nội bộ trong dữ liệu trả về.');
      return parts.join('\n');
    }

    const recentInsiders = d.insiderTransactions.slice(0, 12);
    const recent = recentInsiders
      .map(
        (r) =>
          `${r.publicDate?.split('T')[0] || r.startDate?.split('T')[0] || ''} | Hành động: ${r.action} | Nắm giữ trước: ${r.shareBefore || 0} | KL thực hiện/đăng ký: ${r.shareExecuted || r.shareRegistered || 0} | Nắm giữ còn lại: ${r.shareAfter || 0}`,
      )
      .join('\n');

    parts.push(`${recentInsiders.length} thông báo gần nhất:`);
    parts.push(recent);

    return parts.join('\n');
  }

  private buildNewsSection(d: InsightRawData): string {
    const parts = ['## DỮ LIỆU CHO L5 (Tin tức)'];

    if (d.tickerScore) {
      parts.push(
        `Điểm sentiment: ${d.tickerScore.score}/10 (Tích cực: ${d.tickerScore.countPositive}, Tiêu cực: ${d.tickerScore.countNegative})`,
      );
    }

    const recentNews = d.news.slice(0, 5);
    const newsStr = recentNews
      .map(
        (n: any, i: number) =>
          `${i + 1}. ${n.title} (${n.sourceName || ''}, ${n.updatedAt?.split(' ')[0] || ''})`,
      )
      .join('\n');
    parts.push(
      `Tin tức (${recentNews.length} tin gần nhất):\n${newsStr || 'Không có'}`,
    );

    return parts.join('\n');
  }

  private getTrendMetrics(d: InsightRawData) {
    const ohlcv30 = d.ohlcv.slice(-30);
    const last10 = d.ohlcv.slice(-10);
    const last20 = d.ohlcv.slice(-20);
    const ma10 = last10.length
      ? last10.reduce((s, r) => s + r.close, 0) / last10.length
      : 0;
    const ma20 = last20.length
      ? last20.reduce((s, r) => s + r.close, 0) / last20.length
      : 0;
    const volMa10 = last10.length
      ? last10.reduce((s, r) => s + r.volume, 0) / last10.length
      : 0;
    const volMa20 = last20.length
      ? last20.reduce((s, r) => s + r.volume, 0) / last20.length
      : 0;
    const latestClose = d.ohlcv.length ? d.ohlcv[d.ohlcv.length - 1].close : 0;
    const latestVolume = d.ohlcv.length
      ? d.ohlcv[d.ohlcv.length - 1].volume
      : 0;

    const realtimeStr = d.realtime
      ? `Realtime (Bảng giá live): Giá hiện tại (P0)=${d.realtime.price}, Volume hiện tại (V0)=${d.realtime.volume}, Cao=${d.realtime.high}, Thấp=${d.realtime.low}, Tham chiếu=${d.realtime.ref}${d.realtime.change != null ? `, Thay đổi=${d.realtime.change} (${d.realtime.changePercent?.toFixed(2)}%)` : ''}`
      : `Realtime (Chốt phiên mới nhất): P0=${latestClose.toFixed(2)}, V0=${latestVolume}`;

    return {
      ohlcv30,
      ma10,
      ma20,
      volMa10,
      volMa20,
      latestClose,
      latestVolume,
      realtimeStr,
    };
  }

  private asText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private containsAny(text: string, needles: string[]): boolean {
    const lower = text.toLowerCase();
    return needles.some((needle) => lower.includes(needle));
  }

  private pickFactor(label: string, text: string, needles: string[]): string {
    return this.containsAny(text, needles) ? label : '';
  }

  private scoreTrend(trendText: string, stateText: string): number {
    let score = 0;
    if (this.containsAny(trendText, ['tăng'])) score += 2;
    if (this.containsAny(trendText, ['giảm'])) score -= 2;
    if (this.containsAny(stateText, ['mạnh'])) score += 1;
    if (this.containsAny(stateText, ['yếu'])) score -= 1;
    return score;
  }

  private scoreLiquidity(
    liquidityText: string,
    supplyDemandText: string,
    impactText: string,
  ): number {
    let score = 0;
    if (this.containsAny(liquidityText, ['cải thiện'])) score += 1;
    if (this.containsAny(liquidityText, ['suy yếu'])) score -= 1;
    if (this.containsAny(supplyDemandText, ['thuận lợi'])) score += 1;
    if (this.containsAny(supplyDemandText, ['kẹt lệnh', 'thanh khoản yếu']))
      score -= 1;
    if (this.containsAny(impactText, ['thuận lợi'])) score += 1;
    if (this.containsAny(impactText, ['bất lợi', 'khó'])) score -= 1;
    return score;
  }

  private scoreMoneyFlow(
    foreignText: string,
    proprietaryText: string,
    impactText: string,
  ): number {
    let score = 0;
    if (this.containsAny(foreignText, ['mua ròng'])) score += 1;
    if (this.containsAny(foreignText, ['bán ròng'])) score -= 1;
    if (this.containsAny(proprietaryText, ['mua ròng'])) score += 1;
    if (this.containsAny(proprietaryText, ['bán ròng'])) score -= 1;
    if (this.containsAny(impactText, ['ủng hộ'])) score += 1;
    if (this.containsAny(impactText, ['cảnh báo'])) score -= 1;
    return score;
  }

  private scoreInsider(insiderText: string, alertText: string): number {
    let score = 0;
    if (this.containsAny(insiderText, ['mua'])) score += 1;
    if (this.containsAny(insiderText, ['bán'])) score -= 1;
    if (this.containsAny(alertText, ['hỗ trợ'])) score += 1;
    if (this.containsAny(alertText, ['thận trọng'])) score -= 1;
    return score;
  }

  private scoreNews(overviewText: string, impactText: string): number {
    let score = 0;
    if (this.containsAny(overviewText, ['tích cực'])) score += 1;
    if (this.containsAny(overviewText, ['tiêu cực'])) score -= 1;
    if (this.containsAny(impactText, ['hỗ trợ'])) score += 1;
    if (this.containsAny(impactText, ['áp lực'])) score -= 1;
    return score;
  }

  private buildActionReason(
    action: string,
    positiveFactors: string[],
    riskFactors: string[],
  ): string {
    if (action === 'Mua') {
      return `ưu tiên khi ${positiveFactors.slice(0, 2).join(' và ') || 'các tín hiệu đang đồng thuận'}`;
    }

    if (action === 'Giữ') {
      return `giữ vị thế do ${positiveFactors[0] || 'xu hướng chưa xấu'} nhưng vẫn cần theo dõi ${riskFactors[0] || 'biến động ngắn hạn'}`;
    }

    if (action === 'Giảm tỷ trọng') {
      return `thận trọng vì ${riskFactors.slice(0, 2).join(' và ') || 'rủi ro ngắn hạn đang tăng'}`;
    }

    return `chờ thêm xác nhận vì ${riskFactors[0] || 'các tín hiệu chưa đủ đồng thuận'}`;
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

    const ratio =
      (latest.totalVolume || 0) > 0
        ? (latest.totalNetVolume || 0) / latest.totalVolume
        : 0;

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
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

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
