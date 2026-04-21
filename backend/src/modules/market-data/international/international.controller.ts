import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { InternationalService } from './international.service';

@ApiTags('Dữ liệu quốc tế')
@Controller('market-data/international')
export class InternationalController {
  constructor(private readonly service: InternationalService) {}

  @Public()
  @Get('dukascopy/:symbol/daily')
  @ApiOperation({ summary: 'Nến ngày Dukascopy' })
  @ApiParam({ name: 'symbol', description: 'e.g., EUR-USD' })
  @ApiQuery({ name: 'side', required: false, enum: ['BID', 'ASK'] })
  getDukascopyDaily(
    @Param('symbol') symbol: string,
    @Query('side') side?: string,
  ) {
    return this.service.getDukascopyDailyCandles(symbol, side);
  }

  @Public()
  @Get('binance/klines')
  @ApiOperation({ summary: 'Binance OHLCV klines' })
  @ApiQuery({ name: 'symbol', required: true, description: 'e.g., BTCUSDT' })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'e.g., 1d, 1h, 15m',
  })
  @ApiQuery({ name: 'limit', required: false })
  getBinanceKlines(
    @Query('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getBinanceKlines({ symbol, interval, limit });
  }

  @Public()
  @Get('binance/depth')
  @ApiOperation({ summary: 'Binance order book' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'limit', required: false })
  getBinanceDepth(
    @Query('symbol') symbol: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getBinanceOrderBook(symbol, limit);
  }

  @Public()
  @Get('binance/ticker-24h')
  @ApiOperation({ summary: 'Binance 24h ticker' })
  @ApiQuery({ name: 'symbol', required: true })
  getBinanceTicker(@Query('symbol') symbol: string) {
    return this.service.getBinanceTicker24h(symbol);
  }
}
