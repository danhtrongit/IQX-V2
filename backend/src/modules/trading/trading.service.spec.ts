import { Test, TestingModule } from '@nestjs/testing';
import { TradingService } from './trading.service';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MarketDataGateway } from './market-data.gateway';

describe('TradingService', () => {
  let service: TradingService;
  let http: {
    withFallback: jest.Mock;
    kbsPost: jest.Mock;
    vciPost: jest.Mock;
  };

  beforeEach(async () => {
    const mockHttp = {
      withFallback: jest.fn(),
      kbsPost: jest.fn(),
      vciPost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        { provide: ProxyHttpService, useValue: mockHttp },
        {
          provide: MarketDataGateway,
          useValue: { broadcastMarketIndices: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    http = module.get(ProxyHttpService);
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
});
