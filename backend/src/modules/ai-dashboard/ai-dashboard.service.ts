import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';
import { TradingService } from '../trading/trading.service';
import { AI_DASHBOARD_SYSTEM_PROMPT } from './ai-dashboard.prompt';
import { MESSAGES } from '../../common/constants/messages.constant';

interface SectorAnalysisResult {
  trang_thai: string;
  hieu_suat: string;
  dong_tien: string;
  do_rong: string;
  dan_dat: string;
  diem_yeu: string;
  co_hoi: string;
  rui_ro: string;
}

interface SectorAnalysisItem {
  icbCode: number;
  icbName: string | null;
  enIcbName: string | null;
  label: string;
  analysis: SectorAnalysisResult | null;
}

@Injectable()
export class AiDashboardService {
  private readonly logger = new Logger(AiDashboardService.name);
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(
    private config: ConfigService,
    private tradingService: TradingService,
    private cacheService: RedisCacheService,
  ) {
    this.baseUrl = this.config.get<string>('AI_BASE_URL', '');
    this.apiKey = this.config.get<string>('AI_API_KEY', '');
    this.model = this.config.get<string>('AI_MODEL', 'gpt-5.4');
  }

  async analyzeSector(group: string, icbCode: number): Promise<any> {
    const normalizedGroup = group.toUpperCase();
    const cacheKey = `ai-dashboard:sector:${normalizedGroup}:${icbCode}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.AI_INSIGHT,
      );
      if (cached) {
        this.logger.debug(
          `Cache HIT for AI dashboard sector: ${normalizedGroup}:${icbCode}`,
        );
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for AI dashboard: ${error.message}`);
    }

    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      return { message: 'AI_API_KEY chưa được cấu hình.', data: null };
    }

    const overviewData =
      await this.tradingService.getSectorOverview(normalizedGroup);

    const overview = overviewData?.data?.overview || [];
    const benchmark = overviewData?.data?.benchmark || {};

    // Find the target industry across all overview groups
    let targetIndustry: any = null;
    for (const overviewGroup of overview) {
      const found = (overviewGroup.industries || []).find(
        (ind: any) => ind.icbCode === icbCode,
      );
      if (found) {
        targetIndustry = found;
        break;
      }
    }

    if (!targetIndustry) {
      return {
        message: MESSAGES.COMMON.SUCCESS,
        data: {
          group: normalizedGroup,
          icbCode,
          asOfDate: overviewData?.data?.asOfDate || null,
          analysis: null,
          reason:
            'Không tìm thấy dữ liệu ngành với mã ICB này hoặc ngành chưa phân loại',
        },
      };
    }

    const inputText = this.buildSectorInputText(targetIndustry, benchmark);
    const analysis = await this.runAiAnalysis(inputText);

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        group: normalizedGroup,
        icbCode,
        icbName: targetIndustry.icbName,
        enIcbName: targetIndustry.enIcbName,
        label: targetIndustry.result?.label || null,
        asOfDate: overviewData?.data?.asOfDate || null,
        analysis,
        rawInsight: targetIndustry.insight || null,
      },
    };

    if (analysis) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.AI_INSIGHT);
      } catch (error) {
        this.logger.warn(`Cache set failed: ${error.message}`);
      }
    }

    return response;
  }

  async analyzeAllSectors(group: string): Promise<any> {
    const normalizedGroup = group.toUpperCase();
    const cacheKey = `ai-dashboard:all:${normalizedGroup}`;

    try {
      const cached = await this.cacheService.get<any>(
        cacheKey,
        CacheType.AI_INSIGHT,
      );
      if (cached) {
        this.logger.debug(
          `Cache HIT for AI dashboard all sectors: ${normalizedGroup}`,
        );
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed: ${error.message}`);
    }

    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      return { message: 'AI_API_KEY chưa được cấu hình.', data: null };
    }

    const overviewData =
      await this.tradingService.getSectorOverview(normalizedGroup);

    const overview = overviewData?.data?.overview || [];
    const benchmark = overviewData?.data?.benchmark || {};

    // Flatten all industries across all groups
    const allIndustries: any[] = [];
    for (const overviewGroup of overview) {
      for (const industry of overviewGroup.industries || []) {
        allIndustries.push(industry);
      }
    }

    this.logger.log(
      `Analyzing ${allIndustries.length} sectors for ${normalizedGroup}`,
    );

    const analysisResults: SectorAnalysisItem[] = await Promise.all(
      allIndustries.map(async (industry: any) => {
        const inputText = this.buildSectorInputText(industry, benchmark);
        const analysis = await this.runAiAnalysis(inputText);

        return {
          icbCode: industry.icbCode,
          icbName: industry.icbName,
          enIcbName: industry.enIcbName,
          label: industry.result?.label || null,
          analysis,
        };
      }),
    );

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        group: normalizedGroup,
        asOfDate: overviewData?.data?.asOfDate || null,
        total: analysisResults.length,
        sectors: analysisResults,
      },
    };

    const allSucceeded = analysisResults.every((r) => r.analysis !== null);
    if (allSucceeded && analysisResults.length > 0) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.AI_INSIGHT);
      } catch (error) {
        this.logger.warn(`Cache set failed: ${error.message}`);
      }
    }

    return response;
  }

  private buildSectorInputText(industry: any, benchmark: any): string {
    const input = industry.input || {};
    const result = industry.result || {};
    const insight = industry.insight || {};

    const parts: string[] = [];

    parts.push(`sector_name: ${industry.icbName || 'Không rõ'}`);
    parts.push(`state: ${result.label || 'Không xác định'}`);

    // Performance metrics
    if (input.D !== null && input.D !== undefined) {
      parts.push(`biến động ngày: ${this.formatPercent(input.D)}`);
    }
    if (input.W !== null && input.W !== undefined) {
      parts.push(`biến động tuần: ${this.formatPercent(input.W)}`);
    }
    if (input.M !== null && input.M !== undefined) {
      parts.push(`biến động tháng: ${this.formatPercent(input.M)}`);
    }

    // Trading value metrics
    if (input.VD !== null && input.VD !== undefined) {
      parts.push(`GTGD ngày: ${this.formatValue(input.VD)}`);
    }
    if (input.VW !== null && input.VW !== undefined) {
      parts.push(`GTGD tuần: ${this.formatValue(input.VW)}`);
    }
    if (input.VM !== null && input.VM !== undefined) {
      parts.push(`GTGD tháng: ${this.formatValue(input.VM)}`);
    }

    // Money flow ratios
    if (input.MDW !== null && input.MDW !== undefined) {
      parts.push(`MDW (GTGD ngày / bình quân tuần): ${input.MDW.toFixed(2)}`);
    }
    if (input.MDM !== null && input.MDM !== undefined) {
      parts.push(`MDM (GTGD ngày / bình quân tháng): ${input.MDM.toFixed(2)}`);
    }
    if (input.MWM !== null && input.MWM !== undefined) {
      parts.push(`MWM (GTGD tuần / bình quân tháng): ${input.MWM.toFixed(2)}`);
    }

    // Breadth from insight
    if (insight.breadth) {
      const b = insight.breadth;
      parts.push(`stocks_up: ${b.advancing}`);
      parts.push(`total_stocks: ${b.total}`);
      if (b.total > 0) {
        parts.push(
          `breadth_pct: ${((b.advancing / b.total) * 100).toFixed(1)}%`,
        );
      }
    }

    // Leaders from insight
    if (insight.leaders) {
      const l = insight.leaders;
      if (l.symbols && l.symbols.length > 0) {
        parts.push(`leaders: ${l.symbols.join(', ')}`);
      }
      if (l.concentrationRatio !== null && l.concentrationRatio !== undefined) {
        parts.push(
          `leaders_contribution_pct: ${(l.concentrationRatio * 100).toFixed(1)}%`,
        );
      }
    }

    // Foreign net volume (sector level)
    if (insight.foreignNet) {
      const fn = insight.foreignNet;
      if (fn.totalNetVolume !== null && fn.totalNetVolume !== undefined) {
        parts.push(`foreign_net_volume: ${fn.totalNetVolume}`);
      }
      if (fn.text) {
        parts.push(`foreign_net_summary: ${fn.text}`);
      }
    }

    // Breadth trend
    if (insight.breadthTrend) {
      const bt = insight.breadthTrend;
      parts.push(`breadth_trend: ${bt.trend}`);
      if (bt.text) {
        parts.push(`breadth_trend_summary: ${bt.text}`);
      }
    }

    // Benchmark context
    if (benchmark.D !== null && benchmark.D !== undefined) {
      parts.push(`vnindex_change_day: ${this.formatPercent(benchmark.D)}`);
    }
    if (benchmark.W !== null && benchmark.W !== undefined) {
      parts.push(`vnindex_change_week: ${this.formatPercent(benchmark.W)}`);
    }
    if (benchmark.M !== null && benchmark.M !== undefined) {
      parts.push(`vnindex_change_month: ${this.formatPercent(benchmark.M)}`);
    }

    // Market context (derived from benchmark)
    if (benchmark.W !== null && benchmark.W !== undefined) {
      let marketTrend = 'đi ngang';
      if (benchmark.W > 1) marketTrend = 'tăng';
      else if (benchmark.W < -1) marketTrend = 'giảm';
      parts.push(
        `market_context: VNINDEX ${marketTrend} ${this.formatPercent(benchmark.W)} trong tuần`,
      );
    }

    // Relative strength
    if (input.W !== null && benchmark.W !== null && benchmark.W !== undefined) {
      parts.push(
        `relative_strength_5d: ${this.formatPercent(input.W - (benchmark.W || 0))}`,
      );
    }

    // Trading session info
    if (input.tradingDaysInWeek) {
      parts.push(`trading_days_in_week: ${input.tradingDaysInWeek}`);
    }
    if (input.tradingDaysInMonth) {
      parts.push(`trading_days_in_month: ${input.tradingDaysInMonth}`);
    }

    // Pre-computed insight text (as additional context)
    if (insight.performance?.text) {
      parts.push(`performance_summary: ${insight.performance.text}`);
    }
    if (insight.moneyFlow?.text) {
      parts.push(`money_flow_summary: ${insight.moneyFlow.text}`);
    }
    if (insight.breadth?.text) {
      parts.push(`breadth_summary: ${insight.breadth.text}`);
    }

    return parts.join('\n');
  }

  private async runAiAnalysis(
    inputText: string,
  ): Promise<SectorAnalysisResult | null> {
    try {
      const raw = await this.chatCompletion(
        AI_DASHBOARD_SYSTEM_PROMPT,
        inputText,
      );
      const parsed = this.tryParseJson(raw);

      if (!parsed || parsed.error || parsed.text) {
        this.logger.warn(`AI analysis returned invalid response`);
        return null;
      }

      return this.normalizeSectorAnalysis(parsed);
    } catch (error: any) {
      this.logger.error(`AI dashboard analysis failed: ${error.message}`);
      return null;
    }
  }

  private normalizeSectorAnalysis(
    raw: Record<string, any>,
  ): SectorAnalysisResult {
    return {
      trang_thai: raw.trang_thai || raw['Trạng thái'] || 'chưa đủ dữ liệu',
      hieu_suat: raw.hieu_suat || raw['Hiệu suất'] || 'chưa đủ dữ liệu',
      dong_tien: raw.dong_tien || raw['Dòng tiền'] || 'chưa đủ dữ liệu',
      do_rong: raw.do_rong || raw['Độ rộng'] || 'chưa đủ dữ liệu',
      dan_dat: raw.dan_dat || raw['Dẫn dắt'] || 'chưa đủ dữ liệu',
      diem_yeu: raw.diem_yeu || raw['Điểm yếu'] || 'chưa đủ dữ liệu',
      co_hoi: raw.co_hoi || raw['Cơ hội'] || 'chưa đủ dữ liệu',
      rui_ro: raw.rui_ro || raw['Rủi ro'] || 'chưa đủ dữ liệu',
    };
  }

  // ── AI API (Responses API, same pattern as AiInsightService) ──

  private async chatCompletion(
    systemPrompt: string,
    userMessage: string,
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
        max_output_tokens: 512,
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

    const reader = (res.body as any).getReader();
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

  // ── Helpers ──

  private tryParseJson(raw: string): any {
    try {
      let cleaned = raw.trim();
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

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

  private formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private formatValue(value: number): string {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)} nghìn tỷ`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} triệu`;
    return value.toLocaleString('vi-VN');
  }
}
