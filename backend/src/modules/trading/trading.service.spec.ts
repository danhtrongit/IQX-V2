import { Test, TestingModule } from '@nestjs/testing';
import { TradingService } from './trading.service';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MarketDataGateway } from './market-data.gateway';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

describe('TradingService', () => {
  let service: TradingService;
  let http: {
    withFallback: jest.Mock;
    kbsPost: jest.Mock;
    vciPost: jest.Mock;
    vciGraphql: jest.Mock;
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(async () => {
    const mockHttp = {
      withFallback: jest.fn(),
      kbsPost: jest.fn(),
      vciPost: jest.fn(),
      vciGraphql: jest.fn(),
    };
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        { provide: ProxyHttpService, useValue: mockHttp },
        { provide: RedisCacheService, useValue: mockCacheService },
        {
          provide: MarketDataGateway,
          useValue: { broadcastMarketIndices: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    http = module.get(ProxyHttpService);
    cacheService = module.get(RedisCacheService);
  });

  describe('getAllocatedIcb', () => {
    it('should call Vietcap allocated ICB endpoint and normalize response', async () => {
      http.vciPost.mockResolvedValue([
        {
          icb_code: 2700,
          icbChangePercent: '0.5784472571019393',
          totalPriceChange: '1294438266164.225',
          totalMarketCap: 223778097358340,
          totalValue: '5992454165900',
          totalStockIncrease: '13',
          totalStockDecrease: 27,
          totalStockNoChange: '1',
          icbCodeParent: 2000,
        },
      ]);

      const result = await service.getAllocatedIcb({
        group: 'HOSE',
        timeFrame: 'ONE_WEEK',
      });

      expect(http.vciPost).toHaveBeenCalledWith(
        '/market-watch/AllocatedICB/getAllocated',
        { group: 'HOSE', timeFrame: 'ONE_WEEK' },
      );
      expect(result).toEqual({
        message: 'Thành công',
        data: [
          {
            icbCode: 2700,
            icbChangePercent: 0.5784472571019393,
            totalPriceChange: 1294438266164.225,
            totalMarketCap: 223778097358340,
            totalValue: 5992454165900,
            totalStockIncrease: 13,
            totalStockDecrease: 27,
            totalStockNoChange: 1,
            icbCodeParent: 2000,
          },
        ],
      });
    });
  });

  describe('getAllocatedIcbDetail', () => {
    it('should normalize top-level data and stock details', async () => {
      http.vciPost.mockResolvedValue({
        icb_code: 2700,
        icbChangePercent: 0.5784472571019393,
        totalPriceChange: 1294438266164.225,
        totalMarketCap: 223778097358340,
        totalValue: 5992454165900,
        totalStockIncrease: 13,
        totalStockDecrease: 27,
        totalStockNoChange: 1,
        icbCodeParent: 2000,
        icbDataDetail: [
          {
            symbol: 'GEE',
            refPrice: 184600,
            matchPrice: 199000,
            ceilingPrice: null,
            floorPrice: null,
            accumulatedVolume: '7300361.0',
            accumulatedValue: '1460907772200.0',
            organName: 'Công ty Cổ phần Điện lực Gelex',
            organShortName: 'Thiết bị điện GELEX',
            enOrganName: 'GELEX Electricity Joint Stock Company',
            enOrganShortName: 'GELEX Electric',
            foreignNetVolume: '435568.0',
            foreignNetValue: '84857913400.0',
            board: 'HSX',
          },
        ],
      });

      const result = await service.getAllocatedIcbDetail({
        group: 'HOSE',
        timeFrame: 'ONE_WEEK',
        icbCode: 2700,
      });

      expect(http.vciPost).toHaveBeenCalledWith(
        '/market-watch/AllocatedICB/getAllocatedDetail',
        { group: 'HOSE', timeFrame: 'ONE_WEEK', icbCode: 2700 },
      );
      expect(result).toEqual({
        message: 'Thành công',
        data: {
          icbCode: 2700,
          icbChangePercent: 0.5784472571019393,
          totalPriceChange: 1294438266164.225,
          totalMarketCap: 223778097358340,
          totalValue: 5992454165900,
          totalStockIncrease: 13,
          totalStockDecrease: 27,
          totalStockNoChange: 1,
          icbCodeParent: 2000,
          stocks: [
            {
              symbol: 'GEE',
              referencePrice: 184600,
              matchPrice: 199000,
              ceilingPrice: null,
              floorPrice: null,
              accumulatedVolume: 7300361,
              accumulatedValue: 1460907772200,
              organName: 'Công ty Cổ phần Điện lực Gelex',
              organShortName: 'Thiết bị điện GELEX',
              enOrganName: 'GELEX Electricity Joint Stock Company',
              enOrganShortName: 'GELEX Electric',
              foreignNetVolume: 435568,
              foreignNetValue: 84857913400,
              exchange: 'HSX',
            },
          ],
        },
      });
    });
  });

  describe('getSectorSignals', () => {
    it('should aggregate D/W/M metrics and classify sectors', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 1,
              totalValue: 150,
              icbCodeParent: 2000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 3,
              totalValue: 500,
              icbCodeParent: 2000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 6,
              totalValue: 1000,
              icbCodeParent: 2000,
            },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '2700',
              level: 2,
              icbName: 'Hàng & Dịch vụ Công nghiệp',
              enIcbName: 'Industrial Goods & Services',
            },
          ],
        },
      });

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 2700,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(http.vciGraphql).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:v2:HOSE:2700',
        CacheType.TRADING,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'trading:sector-signals:v2:HOSE:2700',
        {
          message: 'Thành công',
          data: {
            group: 'HOSE',
            icbCode: 2700,
            asOfDate: '2025-04-07',
            item: {
              icbCode: 2700,
              icbName: 'Hàng & Dịch vụ Công nghiệp',
              enIcbName: 'Industrial Goods & Services',
              icbLevel: 2,
              icbCodeParent: 2000,
              input: {
                D: 1,
                W: 3,
                M: 6,
                VD: 150,
                VW: 500,
                VM: 1000,
                MDW: 1.5,
                MDM: 0.9,
                MWM: 2,
                tradingDaysInWeek: 5,
                tradingDaysInMonth: 6,
              },
              result: {
                label: 'Hút tiền',
                matchedLabels: ['Hút tiền'],
                isExactMatch: true,
              },
            },
          },
        },
        CacheType.TRADING,
      );
      expect(result).toEqual({
        message: 'Thành công',
        data: {
          group: 'HOSE',
          icbCode: 2700,
          asOfDate: '2025-04-07',
          item: {
            icbCode: 2700,
            icbName: 'Hàng & Dịch vụ Công nghiệp',
            enIcbName: 'Industrial Goods & Services',
            icbLevel: 2,
            icbCodeParent: 2000,
            input: {
              D: 1,
              W: 3,
              M: 6,
              VD: 150,
              VW: 500,
              VM: 1000,
              MDW: 1.5,
              MDM: 0.9,
              MWM: 2,
              tradingDaysInWeek: 5,
              tradingDaysInMonth: 6,
            },
            result: {
              label: 'Hút tiền',
              matchedLabels: ['Hút tiền'],
              isExactMatch: true,
            },
          },
        },
      });
    });

    it('should return null label when no rule matches exactly', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 0.5,
              totalValue: 150,
              icbCodeParent: 2000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 1,
              totalValue: 787.5,
              icbCodeParent: 2000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 2700,
              icbChangePercent: 6,
              totalValue: 3000,
              icbCodeParent: 2000,
            },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '2700',
              level: 2,
              icbName: 'Hàng & Dịch vụ Công nghiệp',
              enIcbName: 'Industrial Goods & Services',
            },
          ],
        },
      });

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 2700,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(result.data.item.result).toEqual({
        label: null,
        matchedLabels: [],
        isExactMatch: false,
      });
    });

    it('should require W <= -8 for Hồi kỹ thuật label', async () => {
      const buildSectorSignal = async (weeklyChangePercent: number) => {
        http.vciPost.mockImplementation(async (path: string, body: any) => {
          if (
            path === '/market-watch/AllocatedICB/getAllocated' &&
            body.timeFrame === 'ONE_DAY'
          ) {
            return [
              {
                icb_code: 2700,
                icbChangePercent: 1,
                totalValue: 200,
                icbCodeParent: 2000,
              },
            ];
          }

          if (
            path === '/market-watch/AllocatedICB/getAllocated' &&
            body.timeFrame === 'ONE_WEEK'
          ) {
            return [
              {
                icb_code: 2700,
                icbChangePercent: weeklyChangePercent,
                totalValue: 800,
                icbCodeParent: 2000,
              },
            ];
          }

          if (
            path === '/market-watch/AllocatedICB/getAllocated' &&
            body.timeFrame === 'ONE_MONTH'
          ) {
            return [
              {
                icb_code: 2700,
                icbChangePercent: -9,
                totalValue: 1000,
                icbCodeParent: 2000,
              },
            ];
          }

          if (path === '/chart/OHLCChart/gap-chart') {
            return [
              {
                t: [
                  1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                  1743987600,
                ],
              },
            ];
          }

          throw new Error(`Unexpected vciPost call: ${path}`);
        });

        http.vciGraphql.mockResolvedValue({
          data: {
            ListIcbCode: [
              {
                icbCode: '2700',
                level: 2,
                icbName: 'Hàng & Dịch vụ Công nghiệp',
                enIcbName: 'Industrial Goods & Services',
              },
            ],
          },
        });

        return service.getSectorSignals({
          group: 'HOSE',
          icb_code: 2700,
          get icbCode() {
            return this.icb_code;
          },
        });
      };

      const noMatchResult = await buildSectorSignal(-7.5);
      expect(noMatchResult.data.item.result).toEqual({
        label: null,
        matchedLabels: [],
        isExactMatch: false,
      });

      const matchedResult = await buildSectorSignal(-8);
      expect(matchedResult.data.item.result).toEqual({
        label: 'Hồi kỹ thuật',
        matchedLabels: ['Hồi kỹ thuật'],
        isExactMatch: true,
      });
    });

    it('should return cached sector signal response on cache hit', async () => {
      const cachedResponse = {
        message: 'Thành công',
        data: {
          group: 'HOSE',
          icbCode: 2700,
          asOfDate: '2025-04-07',
          item: {
            icbCode: 2700,
            result: {
              label: null,
              matchedLabels: [],
              isExactMatch: false,
            },
          },
        },
      };
      cacheService.get.mockResolvedValue(cachedResponse);

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 2700,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(result).toEqual(cachedResponse);
      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:v2:HOSE:2700',
        CacheType.TRADING,
      );
      expect(http.vciPost).not.toHaveBeenCalled();
      expect(http.vciGraphql).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should roll up child sectors when direct level-1 data is missing', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 1,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 200,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 2,
              totalPriceChange: 20,
              totalMarketCap: 1000,
              totalValue: 100,
              icbCodeParent: 1000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 2,
              totalPriceChange: 10,
              totalMarketCap: 500,
              totalValue: 300,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 2,
              totalPriceChange: 10,
              totalMarketCap: 500,
              totalValue: 200,
              icbCodeParent: 1000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 8,
              totalPriceChange: 20,
              totalMarketCap: 250,
              totalValue: 600,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 4,
              totalPriceChange: 30,
              totalMarketCap: 750,
              totalValue: 400,
              icbCodeParent: 1000,
            },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '1000',
              level: 1,
              icbName: 'Nguyên vật liệu',
              enIcbName: 'Basic Materials',
            },
            {
              icbCode: '1300',
              level: 2,
              icbName: 'Hóa chất',
              enIcbName: 'Chemicals',
            },
            {
              icbCode: '1700',
              level: 2,
              icbName: 'Tài nguyên Cơ bản',
              enIcbName: 'Basic Resources',
            },
          ],
        },
      });

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 1000,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(result).toEqual({
        message: 'Thành công',
        data: {
          group: 'HOSE',
          icbCode: 1000,
          asOfDate: '2025-04-07',
          item: {
            icbCode: 1000,
            icbName: 'Nguyên vật liệu',
            enIcbName: 'Basic Materials',
            icbLevel: 1,
            icbCodeParent: null,
            input: {
              D: 1.5,
              W: 2,
              M: 5,
              VD: 300,
              VW: 500,
              VM: 1000,
              MDW: 3,
              MDM: 1.8,
              MWM: 2,
              tradingDaysInWeek: 5,
              tradingDaysInMonth: 6,
            },
            result: {
              label: 'Dẫn sóng',
              matchedLabels: ['Dẫn sóng', 'Hút tiền'],
              isExactMatch: true,
            },
          },
        },
      });
    });

    it('should infer standard level-2 children when parent mapping is missing upstream', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 8300,
              icbChangePercent: 1,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 200,
              icbCodeParent: 8301,
            },
            {
              icb_code: 8500,
              icbChangePercent: 1,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 100,
              icbCodeParent: null,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 8300,
              icbChangePercent: 0,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 200,
              icbCodeParent: 8301,
            },
            {
              icb_code: 8500,
              icbChangePercent: 0,
              totalPriceChange: 0,
              totalMarketCap: 1000,
              totalValue: 100,
              icbCodeParent: null,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 8300,
              icbChangePercent: 0.5,
              totalPriceChange: 10,
              totalMarketCap: 2000,
              totalValue: 400,
              icbCodeParent: 8301,
            },
            {
              icb_code: 8500,
              icbChangePercent: 1,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 200,
              icbCodeParent: null,
            },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '8000',
              level: 1,
              icbName: 'Tài chính',
              enIcbName: 'Financials',
            },
            {
              icbCode: '8300',
              level: 2,
              icbName: 'Ngân hàng',
              enIcbName: 'Banks',
            },
            {
              icbCode: '8500',
              level: 2,
              icbName: 'Bảo hiểm',
              enIcbName: 'Insurance',
            },
          ],
        },
      });

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 8000,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(result.data.item).toMatchObject({
        icbCode: 8000,
        icbName: 'Tài chính',
        enIcbName: 'Financials',
        icbLevel: 1,
        icbCodeParent: null,
        result: {
          label: 'Hút tiền',
          matchedLabels: ['Hút tiền'],
          isExactMatch: true,
        },
      });
      expect(result.data.item.input.D).toBeCloseTo(1);
      expect(result.data.item.input.W).toBeCloseTo(0.5);
      expect(result.data.item.input.M).toBeCloseTo(0.6666666667);
      expect(result.data.item.input.VD).toBe(300);
      expect(result.data.item.input.VW).toBe(300);
      expect(result.data.item.input.VM).toBe(600);
      expect(result.data.item.input.MDW).toBeCloseTo(5);
      expect(result.data.item.input.MDM).toBeCloseTo(3);
      expect(result.data.item.input.MWM).toBeCloseTo(2);
    });

    it('should return null item when no allocated data exists for the icb code', async () => {
      http.vciPost.mockImplementation(async (path: string) => {
        if (path === '/market-watch/AllocatedICB/getAllocated') return [];
        if (path === '/chart/OHLCChart/gap-chart') return [{ t: [] }];
        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '2700',
              level: 2,
              icbName: 'Hàng & Dịch vụ Công nghiệp',
              enIcbName: 'Industrial Goods & Services',
            },
          ],
        },
      });

      const result = await service.getSectorSignals({
        group: 'HOSE',
        icb_code: 2700,
        get icbCode() {
          return this.icb_code;
        },
      });

      expect(result).toEqual({
        message: 'Thành công',
        data: {
          group: 'HOSE',
          icbCode: 2700,
          asOfDate: null,
          item: null,
        },
      });
    });
  });

  describe('getAllSectorSignals', () => {
    it('should return all available sector signals across levels without overview', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 1,
              totalPriceChange: 10,
              totalMarketCap: 1000,
              totalValue: 200,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 2,
              totalPriceChange: 20,
              totalMarketCap: 1000,
              totalValue: 100,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 1000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 2,
              totalPriceChange: 10,
              totalMarketCap: 500,
              totalValue: 300,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 2,
              totalPriceChange: 10,
              totalMarketCap: 500,
              totalValue: 200,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 1000,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 1300,
              icbChangePercent: 8,
              totalPriceChange: 20,
              totalMarketCap: 250,
              totalValue: 600,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 1000,
            },
            {
              icb_code: 1700,
              icbChangePercent: 4,
              totalPriceChange: 30,
              totalMarketCap: 750,
              totalValue: 400,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 1000,
            },
          ];
        }

        if (path === '/market-watch/AllocatedICB/getAllocatedDetail') {
          if (body.icbCode === 1300) {
            return {
              icb_code: 1300,
              icbDataDetail: [
                { symbol: 'DGC', accumulatedValue: 70, refPrice: 10, matchPrice: 11 },
                { symbol: 'CSV', accumulatedValue: 50, refPrice: 10, matchPrice: 10.5 },
                { symbol: 'DDV', accumulatedValue: 40, refPrice: 10, matchPrice: 10.2 },
              ],
            };
          }

          if (body.icbCode === 1700) {
            return {
              icb_code: 1700,
              icbDataDetail: [
                { symbol: 'HPG', accumulatedValue: 35, refPrice: 10, matchPrice: 10.2 },
                { symbol: 'HSG', accumulatedValue: 25, refPrice: 10, matchPrice: 10.1 },
                { symbol: 'NKG', accumulatedValue: 20, refPrice: 10, matchPrice: 10.0 },
              ],
            };
          }

          return { icb_code: body.icbCode, icbDataDetail: [] };
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
              c: [99, 100, 100.5, 101, 101.5, 102],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '1000',
              level: 1,
              icbName: 'Nguyên vật liệu',
              enIcbName: 'Basic Materials',
            },
            {
              icbCode: '1300',
              level: 2,
              icbName: 'Hóa chất',
              enIcbName: 'Chemicals',
            },
            {
              icbCode: '1700',
              level: 2,
              icbName: 'Tài nguyên Cơ bản',
              enIcbName: 'Basic Resources',
            },
          ],
        },
      });

      const result = await service.getAllSectorSignals({ group: 'HOSE' });

      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:v3:HOSE',
        CacheType.TRADING,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:v3:HOSE',
        result,
        CacheType.TRADING,
      );
      expect(result.data).toEqual(
        expect.objectContaining({
          group: 'HOSE',
          asOfDate: '2025-04-07',
          total: 2,
          items: [
            expect.objectContaining({
              icbCode: 1300,
              result: {
                label: 'Dẫn sóng',
                matchedLabels: ['Dẫn sóng', 'Hút tiền'],
                isExactMatch: true,
              },
            }),
            expect.objectContaining({
              icbCode: 1700,
              result: {
                label: 'Hút tiền',
                matchedLabels: ['Hút tiền'],
                isExactMatch: true,
              },
            }),
          ],
        }),
      );
      expect(result.data).not.toHaveProperty('overview');
      expect(http.vciPost).not.toHaveBeenCalledWith(
        '/market-watch/AllocatedICB/getAllocatedDetail',
        expect.anything(),
      );
    });

    it('should keep only exact matches and apply top limits by label', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 1, totalValue: 200, totalStockIncrease: 7, totalStockDecrease: 2, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 0.5, totalValue: 150, totalStockIncrease: 6, totalStockDecrease: 3, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: -1, totalValue: 140, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 2700, icbChangePercent: -0.5, totalValue: 120, totalStockIncrease: 4, totalStockDecrease: 4, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 3500, icbChangePercent: 0, totalValue: 100, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 3000 },
            { icb_code: 4500, icbChangePercent: 0.2, totalValue: 100, totalStockIncrease: 4, totalStockDecrease: 3, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 4700, icbChangePercent: -1, totalValue: 100, totalStockIncrease: 3, totalStockDecrease: 4, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 5300, icbChangePercent: 1, totalValue: 120, totalStockIncrease: 6, totalStockDecrease: 2, totalStockNoChange: 2, icbCodeParent: 5000 },
            { icb_code: 5700, icbChangePercent: -1.5, totalValue: 90, totalStockIncrease: 2, totalStockDecrease: 5, totalStockNoChange: 3, icbCodeParent: 5000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 4, totalValue: 400, totalStockIncrease: 7, totalStockDecrease: 2, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 3, totalValue: 300, totalStockIncrease: 6, totalStockDecrease: 3, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: 1.8, totalValue: 210, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 2700, icbChangePercent: 1.2, totalValue: 180, totalStockIncrease: 4, totalStockDecrease: 4, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 3500, icbChangePercent: 0.5, totalValue: 160, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 3000 },
            { icb_code: 4500, icbChangePercent: 0, totalValue: 150, totalStockIncrease: 4, totalStockDecrease: 3, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 4700, icbChangePercent: -1, totalValue: 150, totalStockIncrease: 3, totalStockDecrease: 4, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 5300, icbChangePercent: 1.9, totalValue: 165, totalStockIncrease: 6, totalStockDecrease: 2, totalStockNoChange: 2, icbCodeParent: 5000 },
            { icb_code: 5700, icbChangePercent: -2, totalValue: 135, totalStockIncrease: 2, totalStockDecrease: 5, totalStockNoChange: 3, icbCodeParent: 5000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 9, totalValue: 800, totalStockIncrease: 7, totalStockDecrease: 2, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 5, totalValue: 700, totalStockIncrease: 6, totalStockDecrease: 3, totalStockNoChange: 1, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: 3, totalValue: 560, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 2700, icbChangePercent: -1, totalValue: 480, totalStockIncrease: 4, totalStockDecrease: 4, totalStockNoChange: 2, icbCodeParent: 2000 },
            { icb_code: 3500, icbChangePercent: 0, totalValue: 440, totalStockIncrease: 5, totalStockDecrease: 3, totalStockNoChange: 2, icbCodeParent: 3000 },
            { icb_code: 4500, icbChangePercent: 1, totalValue: 600, totalStockIncrease: 4, totalStockDecrease: 3, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 4700, icbChangePercent: -2, totalValue: 600, totalStockIncrease: 3, totalStockDecrease: 4, totalStockNoChange: 3, icbCodeParent: 4000 },
            { icb_code: 5300, icbChangePercent: 5, totalValue: 600, totalStockIncrease: 6, totalStockDecrease: 2, totalStockNoChange: 2, icbCodeParent: 5000 },
            { icb_code: 5700, icbChangePercent: -5, totalValue: 600, totalStockIncrease: 2, totalStockDecrease: 5, totalStockNoChange: 3, icbCodeParent: 5000 },
          ];
        }

        if (path === '/market-watch/AllocatedICB/getAllocatedDetail') {
          const detailMap: Record<number, any[]> = {
            1300: [
              { symbol: 'DGC', accumulatedValue: 80, refPrice: 10, matchPrice: 10.8 },
              { symbol: 'CSV', accumulatedValue: 60, refPrice: 10, matchPrice: 10.5 },
              { symbol: 'DDV', accumulatedValue: 40, refPrice: 10, matchPrice: 10.2 },
            ],
            2300: [
              { symbol: 'SSI', accumulatedValue: 50, refPrice: 10, matchPrice: 10.1 },
              { symbol: 'VND', accumulatedValue: 45, refPrice: 10, matchPrice: 10.0 },
              { symbol: 'HCM', accumulatedValue: 30, refPrice: 10, matchPrice: 9.9 },
            ],
            2700: [
              { symbol: 'GEE', accumulatedValue: 40, refPrice: 10, matchPrice: 10.1 },
              { symbol: 'CII', accumulatedValue: 35, refPrice: 10, matchPrice: 10.0 },
              { symbol: 'HHV', accumulatedValue: 25, refPrice: 10, matchPrice: 9.9 },
            ],
            4500: [
              { symbol: 'DHG', accumulatedValue: 35, refPrice: 10, matchPrice: 10.1 },
              { symbol: 'DMC', accumulatedValue: 25, refPrice: 10, matchPrice: 10.0 },
              { symbol: 'IMP', accumulatedValue: 20, refPrice: 10, matchPrice: 9.9 },
            ],
            4700: [
              { symbol: 'JVC', accumulatedValue: 30, refPrice: 10, matchPrice: 9.8 },
              { symbol: 'TNH', accumulatedValue: 22, refPrice: 10, matchPrice: 9.9 },
              { symbol: 'DVN', accumulatedValue: 18, refPrice: 10, matchPrice: 10.0 },
            ],
            5300: [
              { symbol: 'MWG', accumulatedValue: 50, refPrice: 10, matchPrice: 10.2 },
              { symbol: 'DGW', accumulatedValue: 40, refPrice: 10, matchPrice: 10.1 },
              { symbol: 'FRT', accumulatedValue: 30, refPrice: 10, matchPrice: 10.0 },
            ],
          };

          return {
            icb_code: body.icbCode,
            icbDataDetail: detailMap[body.icbCode] || [],
          };
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
              c: [99, 100, 100.5, 101, 101.5, 102],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            { icbCode: '1300', level: 2, icbName: 'Hóa chất', enIcbName: 'Chemicals' },
            { icbCode: '1700', level: 2, icbName: 'Tài nguyên Cơ bản', enIcbName: 'Basic Resources' },
            { icbCode: '2300', level: 2, icbName: 'Dịch vụ tài chính', enIcbName: 'Financial Services' },
            { icbCode: '2700', level: 2, icbName: 'Hàng & Dịch vụ Công nghiệp', enIcbName: 'Industrial Goods & Services' },
            { icbCode: '3500', level: 2, icbName: 'Thực phẩm & Đồ uống', enIcbName: 'Food & Beverage' },
            { icbCode: '4500', level: 2, icbName: 'Thiết bị & Dịch vụ Y tế', enIcbName: 'Health Care Equipment & Services' },
            { icbCode: '4700', level: 2, icbName: 'Dịch vụ Chăm sóc Sức khỏe', enIcbName: 'Health Care Providers' },
            { icbCode: '5300', level: 2, icbName: 'Bán lẻ', enIcbName: 'Retailers' },
            { icbCode: '5700', level: 2, icbName: 'Du lịch và Giải trí', enIcbName: 'Travel & Leisure' },
          ],
        },
      });

      const result = await service.getAllSectorSignals({ group: 'HOSE' });

      expect(result.data.total).toBe(6);
      expect(result.data.items.map((item: any) => item.icbCode)).toEqual([
        1300, 2300, 2700, 5300, 4500, 4700,
      ]);
      expect(result.data).not.toHaveProperty('overview');
    });

    it('should return full exact-match list when applyTopLimit is false', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 1, totalValue: 600, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 1, totalValue: 400, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: 1, totalValue: 300, icbCodeParent: 2000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 3, totalValue: 600, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 3, totalValue: 500, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: 3, totalValue: 450, icbCodeParent: 2000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 6, totalValue: 1000, icbCodeParent: 1000 },
            { icb_code: 1700, icbChangePercent: 6, totalValue: 1000, icbCodeParent: 1000 },
            { icb_code: 2300, icbChangePercent: 6, totalValue: 1000, icbCodeParent: 2000 },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
              c: [99, 100, 100.5, 101, 101.5, 102],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            { icbCode: '1300', level: 2, icbName: 'Hóa chất', enIcbName: 'Chemicals' },
            { icbCode: '1700', level: 2, icbName: 'Tài nguyên Cơ bản', enIcbName: 'Basic Resources' },
            { icbCode: '2300', level: 2, icbName: 'Dịch vụ tài chính', enIcbName: 'Financial Services' },
          ],
        },
      });

      const result = await service.getAllSectorSignals({
        group: 'HOSE',
        applyTopLimit: false,
      });

      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:v4:HOSE:no-top',
        CacheType.TRADING,
      );
      expect(result.data.applyTopLimit).toBe(false);
      expect(result.data.total).toBe(3);
      expect(result.data.items.map((item: any) => item.icbCode)).toEqual([
        1300, 1700, 2300,
      ]);
      expect(result.data.items.every((item: any) => item.result.label === 'Dẫn sóng')).toBe(
        true,
      );
    });

    it('should return debug inputs for all sectors level 1-2 from icb-codes.json metadata', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 1, totalValue: 300, icbCodeParent: 1000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 3, totalValue: 400, icbCodeParent: 1000 },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            { icb_code: 1300, icbChangePercent: 6, totalValue: 1000, icbCodeParent: 1000 },
          ];
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
              c: [99, 100, 100.5, 101, 101.5, 102],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            { icbCode: '1300', level: 2, icbName: 'Hóa chất', enIcbName: 'Chemicals' },
          ],
        },
      });

      jest
        .spyOn(service as any, 'getIcbCodeMetadataFromIcbJson')
        .mockResolvedValue([
          { icbCode: 1000, level: 1, icbName: 'Nguyên vật liệu', enIcbName: 'Basic Materials' },
          { icbCode: 1300, level: 2, icbName: 'Hóa chất', enIcbName: 'Chemicals' },
          { icbCode: 1700, level: 2, icbName: 'Tài nguyên Cơ bản', enIcbName: 'Basic Resources' },
          { icbCode: 1730, level: 3, icbName: 'Lâm nghiệp và Giấy', enIcbName: 'Forestry & Paper' },
        ]);

      const result = await service.getAllSectorSignals({
        group: 'HOSE',
        applyTopLimit: false,
        debug: true,
      });

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result.data.debug).toBe(true);
      expect(result.data.debugInputs).toEqual(
        expect.objectContaining({
          source: 'icb-codes.json',
          maxLevel: 2,
          total: 3,
          levelCounts: {
            '1': 1,
            '2': 2,
          },
        }),
      );

      const noDataItem = result.data.debugInputs.items.find(
        (item: any) => item.icbCode === 1700,
      );
      expect(noDataItem).toMatchObject({
        icbCode: 1700,
        icbLevel: 2,
        hasAllocatedData: false,
        result: {
          label: null,
          matchedLabels: [],
          isExactMatch: false,
        },
      });
      expect(noDataItem.input.D).toBeNull();
      expect(
        result.data.debugInputs.items.find((item: any) => item.icbCode === 1730),
      ).toBeUndefined();

      const hasDataItem = result.data.debugInputs.items.find(
        (item: any) => item.icbCode === 1300,
      );
      expect(hasDataItem).toMatchObject({
        icbCode: 1300,
        icbLevel: 2,
        hasAllocatedData: true,
      });
      expect(hasDataItem.input.MDW).toBeCloseTo(3.75);
    });

    it('should keep only level 1-2 items', async () => {
      http.vciPost.mockImplementation(async (path: string, body: any) => {
        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_DAY'
        ) {
          return [
            {
              icb_code: 2300,
              icbChangePercent: 0.2,
              totalValue: 100,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 2000,
            },
            {
              icb_code: 2350,
              icbChangePercent: 0.5,
              totalValue: 300,
              totalStockIncrease: 5,
              totalStockDecrease: 3,
              totalStockNoChange: 2,
              icbCodeParent: 2300,
            },
            {
              icb_code: 2351,
              icbChangePercent: 1,
              totalValue: 400,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 2350,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_WEEK'
        ) {
          return [
            {
              icb_code: 2300,
              icbChangePercent: 1,
              totalValue: 200,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 2000,
            },
            {
              icb_code: 2350,
              icbChangePercent: 0.5,
              totalValue: 300,
              totalStockIncrease: 5,
              totalStockDecrease: 3,
              totalStockNoChange: 2,
              icbCodeParent: 2300,
            },
            {
              icb_code: 2351,
              icbChangePercent: 3,
              totalValue: 500,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 2350,
            },
          ];
        }

        if (
          path === '/market-watch/AllocatedICB/getAllocated' &&
          body.timeFrame === 'ONE_MONTH'
        ) {
          return [
            {
              icb_code: 2300,
              icbChangePercent: 1.5,
              totalValue: 400,
              totalStockIncrease: 6,
              totalStockDecrease: 2,
              totalStockNoChange: 2,
              icbCodeParent: 2000,
            },
            {
              icb_code: 2350,
              icbChangePercent: 6,
              totalValue: 2000,
              totalStockIncrease: 5,
              totalStockDecrease: 3,
              totalStockNoChange: 2,
              icbCodeParent: 2300,
            },
            {
              icb_code: 2351,
              icbChangePercent: 7,
              totalValue: 600,
              totalStockIncrease: 7,
              totalStockDecrease: 2,
              totalStockNoChange: 1,
              icbCodeParent: 2350,
            },
          ];
        }

        if (path === '/market-watch/AllocatedICB/getAllocatedDetail') {
          const detailMap: Record<number, any[]> = {
            2300: [
              { symbol: 'SSI', accumulatedValue: 60, refPrice: 10, matchPrice: 10.1 },
            ],
            2350: [
              { symbol: 'ABC', accumulatedValue: 80, refPrice: 10, matchPrice: 10.2 },
            ],
          };

          return {
            icb_code: body.icbCode,
            icbDataDetail: detailMap[body.icbCode] || [],
          };
        }

        if (path === '/chart/OHLCChart/gap-chart') {
          return [
            {
              t: [
                1743382800, 1743469200, 1743555600, 1743642000, 1743728400,
                1743987600,
              ],
              c: [99, 100, 100.5, 101, 101.5, 102],
            },
          ];
        }

        throw new Error(`Unexpected vciPost call: ${path}`);
      });

      http.vciGraphql.mockResolvedValue({
        data: {
          ListIcbCode: [
            {
              icbCode: '2300',
              level: 2,
              icbName: 'Dịch vụ tài chính',
              enIcbName: 'Financial Services',
            },
            {
              icbCode: '2350',
              level: 3,
              icbName: 'Môi giới',
              enIcbName: 'Brokerage',
            },
            {
              icbCode: '2351',
              level: 4,
              icbName: 'Môi giới trực tuyến',
              enIcbName: 'Online Brokerage',
            },
          ],
        },
      });

      const result = await service.getAllSectorSignals({ group: 'HOSE' });

      expect(result.data.total).toBe(1);
      expect(result.data.items.map((item: any) => item.icbCode)).toEqual([
        2300,
      ]);
      expect(result.data.items.find((item: any) => item.icbCode === 2351)).toBeUndefined();
      expect(result.data.items.find((item: any) => item.icbCode === 2350)).toBeUndefined();
      expect(result.data).not.toHaveProperty('overview');
    });

    it('should return cached all-level sector signals on cache hit', async () => {
      const cachedResponse = {
        message: 'Thành công',
        data: {
          group: 'HOSE',
          asOfDate: '2025-04-07',
          total: 1,
          items: [
            {
              icbCode: 1000,
              result: {
                label: 'Hút tiền',
                matchedLabels: [],
                isExactMatch: false,
              },
            },
          ],
        },
      };
      cacheService.get.mockResolvedValue(cachedResponse);

      const result = await service.getAllSectorSignals({
        group: 'HOSE',
      });

      expect(result).toEqual(cachedResponse);
      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:v3:HOSE',
        CacheType.TRADING,
      );
      expect(http.vciPost).not.toHaveBeenCalled();
      expect(http.vciGraphql).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});
