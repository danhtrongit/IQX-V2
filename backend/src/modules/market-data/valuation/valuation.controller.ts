import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ValuationService } from './valuation.service';

@ApiTags('Thống kê & Định giá')
@Controller('market-data/valuation')
export class ValuationController {
  constructor(private readonly service: ValuationService) {}

  @Public()
  @Get('market-pe')
  @ApiOperation({ summary: 'P/E thị trường (VNDIRECT)' })
  @ApiQuery({
    name: 'index',
    required: false,
    description: 'VNINDEX, HNX, VN30',
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'YYYY-MM-DD' })
  getMarketPE(
    @Query('index') index?: string,
    @Query('fromDate') fromDate?: string,
  ) {
    return this.service.getMarketPE(index, fromDate);
  }

  @Public()
  @Get('market-pb')
  @ApiOperation({ summary: 'P/B thị trường (VNDIRECT)' })
  @ApiQuery({ name: 'index', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  getMarketPB(
    @Query('index') index?: string,
    @Query('fromDate') fromDate?: string,
  ) {
    return this.service.getMarketPB(index, fromDate);
  }

  @Public()
  @Get('market-evaluation')
  @ApiOperation({ summary: 'Đánh giá thị trường PE+PB (join by date)' })
  @ApiQuery({ name: 'index', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  getMarketEvaluation(
    @Query('index') index?: string,
    @Query('fromDate') fromDate?: string,
  ) {
    return this.service.getMarketEvaluation(index, fromDate);
  }

  @Public()
  @Get(':symbol/price-history-summary')
  @ApiOperation({ summary: 'Tổng hợp lịch sử giá' })
  @ApiParam({ name: 'symbol' })
  @ApiQuery({ name: 'timeFrame', required: false })
  getPriceHistorySummary(
    @Param('symbol') symbol: string,
    @Query('timeFrame') timeFrame?: string,
  ) {
    return this.service.getPriceHistorySummary(symbol, timeFrame);
  }
}
