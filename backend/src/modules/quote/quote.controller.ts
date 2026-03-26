import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Giá & Khớp lệnh')
@Public()
@Controller('quote')
export class QuoteController {
  constructor(private quoteService: QuoteService) {}

  @Get('history/:symbol')
  @ApiOperation({ summary: 'Giá lịch sử OHLCV' })
  @ApiQuery({ name: 'interval', required: false, description: '1m, 5m, 15m, 30m, 1H, 1D, 1W, 1M', example: '1D' })
  @ApiQuery({ name: 'from', required: false, description: 'Ngày bắt đầu (DD-MM-YYYY)' })
  @ApiQuery({ name: 'to', required: false, description: 'Ngày kết thúc (DD-MM-YYYY)' })
  getHistory(
    @Param('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.quoteService.getHistory(symbol, interval || '1D', from, to);
  }

  @Get('intraday/:symbol')
  @ApiOperation({ summary: 'Dữ liệu khớp lệnh trong ngày' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi', example: '100' })
  getIntraday(
    @Param('symbol') symbol: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quoteService.getIntraday(symbol, Number(page) || 1, Number(limit) || 100);
  }
}
