import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { MacroService } from './macro.service';

@ApiTags('Dữ liệu vĩ mô & hàng hóa')
@Controller('market-data/macro')
export class MacroController {
  constructor(private readonly service: MacroService) {}

  @Public()
  @Get('indicator')
  @ApiOperation({
    summary: 'Chỉ số vĩ mô Việt Nam (GDP, CPI, FX, lãi suất...)',
  })
  @ApiQuery({
    name: 'indicator',
    required: true,
    description: 'gdp, cpi, fx, interest_rate, etc.',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: '1=ngày, 2=tháng, 3=quý, 4=năm',
  })
  @ApiQuery({ name: 'fromYear', required: true })
  @ApiQuery({ name: 'toYear', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getMacroData(
    @Query('indicator') indicator: string,
    @Query('type') type: number,
    @Query('fromYear') fromYear: number,
    @Query('toYear') toYear: number,
    @Query('from') from?: number,
    @Query('to') to?: number,
  ) {
    return this.service.getMacroData({
      indicator,
      type,
      fromYear,
      toYear,
      from,
      to,
    });
  }

  @Public()
  @Get('commodity')
  @ApiOperation({ summary: 'Giá hàng hóa OHLCV (Simplize)' })
  @ApiQuery({
    name: 'ticker',
    required: true,
    description: 'e.g., GC=F, CL=F, GOLD:VN:BUY',
  })
  @ApiQuery({ name: 'interval', required: false, description: '1d, 1h, 1m' })
  @ApiQuery({ name: 'from', required: false, description: 'unix seconds' })
  @ApiQuery({ name: 'to', required: false, description: 'unix seconds' })
  getCommodity(
    @Query('ticker') ticker: string,
    @Query('interval') interval?: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
  ) {
    return this.service.getCommodityOhlcv({ ticker, interval, from, to });
  }
}
