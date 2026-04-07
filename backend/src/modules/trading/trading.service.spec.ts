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
        'trading:sector-signals:HOSE:2700',
        CacheType.TRADING,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'trading:sector-signals:HOSE:2700',
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

    it('should assign the closest label when no rule matches exactly', async () => {
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
        label: 'Hút tiền',
        matchedLabels: [],
        isExactMatch: false,
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
              label: 'Hút tiền',
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
        'trading:sector-signals:HOSE:2700',
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
              totalPriceChange: 0,
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
      expect(result.data.item.input.W).toBeCloseTo(0);
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
    it('should return all available sector signals across levels', async () => {
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

      const result = await service.getAllSectorSignals({
        group: 'HOSE',
      });

      expect(cacheService.get).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:HOSE',
        CacheType.TRADING,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'trading:sector-signals:all-levels:HOSE',
        {
          message: 'Thành công',
          data: {
            group: 'HOSE',
            asOfDate: '2025-04-07',
            total: 3,
            items: [
              {
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
              {
                icbCode: 1300,
                icbName: 'Hóa chất',
                enIcbName: 'Chemicals',
                icbLevel: 2,
                icbCodeParent: 1000,
                input: {
                  D: 1,
                  W: 2,
                  M: 8,
                  VD: 200,
                  VW: 300,
                  VM: 600,
                  MDW: 3.3333333333333335,
                  MDM: 2,
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
              {
                icbCode: 1700,
                icbName: 'Tài nguyên Cơ bản',
                enIcbName: 'Basic Resources',
                icbLevel: 2,
                icbCodeParent: 1000,
                input: {
                  D: 2,
                  W: 2,
                  M: 4,
                  VD: 100,
                  VW: 200,
                  VM: 400,
                  MDW: 2.5,
                  MDM: 1.5,
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
            ],
          },
        },
        CacheType.TRADING,
      );
      expect(result).toEqual({
        message: 'Thành công',
        data: {
          group: 'HOSE',
          asOfDate: '2025-04-07',
          total: 3,
          items: [
            {
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
            {
              icbCode: 1300,
              icbName: 'Hóa chất',
              enIcbName: 'Chemicals',
              icbLevel: 2,
              icbCodeParent: 1000,
              input: {
                D: 1,
                W: 2,
                M: 8,
                VD: 200,
                VW: 300,
                VM: 600,
                MDW: 3.3333333333333335,
                MDM: 2,
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
            {
              icbCode: 1700,
              icbName: 'Tài nguyên Cơ bản',
              enIcbName: 'Basic Resources',
              icbLevel: 2,
              icbCodeParent: 1000,
              input: {
                D: 2,
                W: 2,
                M: 4,
                VD: 100,
                VW: 200,
                VM: 400,
                MDW: 2.5,
                MDM: 1.5,
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
          ],
        },
      });
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
        'trading:sector-signals:all-levels:HOSE',
        CacheType.TRADING,
      );
      expect(http.vciPost).not.toHaveBeenCalled();
      expect(http.vciGraphql).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});
