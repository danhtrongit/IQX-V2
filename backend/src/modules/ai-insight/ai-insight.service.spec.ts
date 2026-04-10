import { AiInsightService } from './ai-insight.service';

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

  const createService = (baseUrl: string) => {
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'AI_BASE_URL') return baseUrl;
        if (key === 'AI_API_KEY') return 'test-api-key';
        if (key === 'AI_MODEL') return 'gpt-5.4';
        return fallback;
      }),
    };

    return new AiInsightService(
      config as any,
      { collect: jest.fn() } as any,
      { get: jest.fn(), set: jest.fn() } as any,
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
      const service = createService('http://160.22.123.174:2111/v1/chat/completions');

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

      jest.spyOn(global, 'fetch').mockResolvedValue(
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

      jest.spyOn(global, 'fetch').mockResolvedValue(
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
});
