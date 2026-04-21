import { AiInsightService } from './ai-insight.service';
import { LAYER_PROMPTS } from './prompts.constant';

describe('AiInsightService', () => {
  const createSseResponse = (...events: string[]) =>
    ({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(events.join('')));
          controller.close();
        },
      }),
    }) as Response;

  const createRawData = (symbol = 'TCB') => ({
    symbol,
    ohlcv: [
      {
        date: '2026-04-10',
        open: 25,
        high: 26,
        low: 24.5,
        close: 25.8,
        volume: 1000000,
      },
    ],
    realtime: {
      price: 25.9,
      volume: 1200000,
      high: 26.1,
      low: 25.1,
      ref: 25.3,
      change: 0.6,
      changePercent: 2.37,
    },
    supplyDemand: [
      {
        buyTradeVolume: 800000,
        sellTradeVolume: 700000,
        buyUnmatchedVolume: 120000,
        sellUnmatchedVolume: 90000,
        totalVolume: 1000000,
      },
    ],
    foreignFlow: [
      {
        totalNetVolume: 100000,
        totalNetValue: 2500000000,
        matchNetVolume: 90000,
        matchNetValue: 2200000000,
        dealNetVolume: 10000,
        dealNetValue: 300000000,
        totalVolume: 1000000,
      },
    ],
    proprietaryFlow: [
      {
        totalNetVolume: 50000,
        totalNetValue: 1200000000,
        matchNetVolume: 40000,
        matchNetValue: 1000000000,
        dealNetVolume: 10000,
        dealNetValue: 200000000,
        totalVolume: 1000000,
      },
    ],
    insiderTransactions: [
      {
        publicDate: '2026-04-09T00:00:00.000Z',
        action: 'Mua',
        shareBefore: 1000000,
        shareExecuted: 50000,
        shareAfter: 1050000,
      },
    ],
    news: [
      {
        title: 'TCB công bố kết quả tích cực',
        sourceName: 'CafeF',
        updatedAt: '2026-04-10 08:00:00',
      },
    ],
    tickerScore: {
      score: 7.5,
      countPositive: 3,
      countNegative: 1,
    },
  });

  const createService = (
    baseUrl: string,
    overrides?: {
      dataCollector?: { collect: jest.Mock };
      cacheService?: { get: jest.Mock; set: jest.Mock };
    },
  ) => {
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'AI_BASE_URL') return baseUrl;
        if (key === 'AI_API_KEY') return 'test-api-key';
        if (key === 'AI_MODEL') return 'gpt-5.4';
        return fallback;
      }),
    };
    const dataCollector = overrides?.dataCollector ?? { collect: jest.fn() };
    const cacheService = overrides?.cacheService ?? {
      get: jest.fn(),
      set: jest.fn(),
    };

    return new AiInsightService(
      config as any,
      dataCollector as any,
      cacheService as any,
    );
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveResponsesUrl', () => {
    it('appends /responses when AI_BASE_URL is a v1 proxy root', () => {
      const service = createService('http://160.22.123.174:2111/v1/');

      expect((service as any).resolveResponsesUrl()).toBe(
        'http://160.22.123.174:2111/v1/responses',
      );
    });

    it('rewrites a legacy chat completions endpoint to /responses', () => {
      const service = createService(
        'http://160.22.123.174:2111/v1/chat/completions',
      );

      expect((service as any).resolveResponsesUrl()).toBe(
        'http://160.22.123.174:2111/v1/responses',
      );
    });

    it('throws a clear error when AI_BASE_URL is missing', () => {
      const service = createService('   ');

      expect(() => (service as any).resolveResponsesUrl()).toThrow(
        'AI_BASE_URL chưa được cấu hình.',
      );
    });
  });

  describe('chatCompletion', () => {
    it('uses the GPT-5.4-compatible responses streaming payload', async () => {
      const service = createService('http://160.22.123.174:2111/v1');
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          createSseResponse(
            'event: response.output_text.delta\n',
            'data: {"type":"response.output_text.delta","delta":"{\\"ok\\""}\n\n',
            'event: response.output_text.delta\n',
            'data: {"type":"response.output_text.delta","delta":":true}"}\n\n',
            'event: response.output_text.done\n',
            'data: {"type":"response.output_text.done","text":"{\\"ok\\":true}"}\n\n',
          ),
        );

      const result = await (service as any).chatCompletion(
        'system prompt',
        'user prompt',
      );

      expect(result).toBe('{"ok":true}');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);

      expect(url).toBe('http://160.22.123.174:2111/v1/responses');
      expect(body.model).toBe('gpt-5.4');
      expect(body.stream).toBe(true);
      expect(body.max_output_tokens).toBe(65536);
      expect(body).not.toHaveProperty('messages');
      expect(body.text).toEqual({ format: { type: 'json_object' } });
      expect(body.input).toEqual([
        {
          role: 'system',
          content: [{ type: 'input_text', text: 'system prompt' }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'QUAN TRỌNG: Chỉ trả về JSON hợp lệ, KHÔNG có text, KHÔNG có markdown. Bắt đầu bằng { và kết thúc bằng }\n\nuser prompt',
            },
          ],
        },
      ]);
    });

    it('throws a detailed error when the stream completes without text', async () => {
      const service = createService('http://160.22.123.174:2111/v1');

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          createSseResponse(
            'event: response.completed\n',
            'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
          ),
        );

      await expect(
        (service as any).chatCompletion('system prompt', 'user prompt'),
      ).rejects.toThrow('AI response empty:');
    });

    it('throws a stream error when the proxy emits an error event', async () => {
      const service = createService('http://160.22.123.174:2111/v1');

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          createSseResponse(
            'event: error\n',
            'data: {"type":"error","error":{"message":"proxy failed"}}\n\n',
          ),
        );

      await expect(
        (service as any).chatCompletion('system prompt', 'user prompt'),
      ).rejects.toThrow('AI stream error: proxy failed');
    });
  });

  describe('analyze', () => {
    it('runs L1-L5 in parallel and only starts L6 after they finish', async () => {
      const dataCollector = {
        collect: jest.fn().mockResolvedValue(createRawData()),
      };
      const cacheService = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      };
      const service = createService('http://160.22.123.174:2111/v1', {
        dataCollector,
        cacheService,
      });

      const calls: string[] = [];
      const resolvers = new Map<string, (value: string) => void>();
      const outputs: Record<string, string> = {
        L1: '{"Xu hướng":"Tăng"}',
        L2: '{"Thanh khoản":"Cải thiện"}',
        L3: '{"Khối ngoại":"Mua ròng"}',
        L4: '{"Nội bộ":"Mua chủ đạo","Mức cảnh báo":"hỗ trợ nhẹ"}',
        L5: '{"Tin tức":["Tin 1 | Tích cực"],"Tổng quan":"nghiêng tích cực","Tác động":"hỗ trợ tâm lý"}',
        L6: '{"Tổng quan":"Tích cực","Thanh khoản":"Cải thiện","Dòng tiền":"Ủng hộ","Giao dịch nội bộ":"Hỗ trợ nhẹ","Tin tức":"Tích cực","Hành động chính":"Quan sát","Kịch bản thuận lợi":"Bứt phá","Kịch bản bất lợi":"Điều chỉnh","Kịch bản đi ngang":"Tích lũy"}',
      };

      jest
        .spyOn(service as any, 'chatCompletion')
        .mockImplementation((prompt: string, userInput: string) => {
          const layerKey = (
            Object.keys(LAYER_PROMPTS) as Array<keyof typeof LAYER_PROMPTS>
          ).find((key) => LAYER_PROMPTS[key] === prompt) as string;

          calls.push(layerKey);

          if (layerKey === 'L6') {
            expect(calls.slice(0, 5)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
            expect(userInput).toContain('"L1"');
            expect(userInput).toContain('"L5"');
            expect(userInput).not.toContain('Tin 1 | Tích cực","Tin 2');
            return Promise.resolve(outputs.L6);
          }

          return new Promise<string>((resolve) => {
            resolvers.set(layerKey, resolve);
          });
        });

      const analyzePromise = service.analyze('tcb');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(calls).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
      expect(calls).not.toContain('L6');

      resolvers.get('L3')?.(outputs.L3);
      resolvers.get('L1')?.(outputs.L1);
      resolvers.get('L5')?.(outputs.L5);
      resolvers.get('L2')?.(outputs.L2);
      resolvers.get('L4')?.(outputs.L4);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(calls).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);

      const result = await analyzePromise;

      expect(result.data.layers.trend.output).toEqual({ 'Xu hướng': 'Tăng' });
      expect(result.data.layers.decision.output['Hành động chính']).toBe(
        'Quan sát',
      );
      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });
  });
});
