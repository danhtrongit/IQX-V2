import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StocksService } from './stocks.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Mã chứng khoán')
@Public()
@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get()
  @ApiOperation({ summary: 'Tìm kiếm mã chứng khoán' })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa (symbol, tên VN/EN)' })
  @ApiQuery({ name: 'exchange', required: false, description: 'Sàn: HOSE, HNX, UPCOM' })
  @ApiQuery({ name: 'sectorCode', required: false, description: 'Mã ngành KBS' })
  @ApiQuery({ name: 'icbCode', required: false, description: 'Mã ICB (level 1-4)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  search(
    @Query('q') q?: string,
    @Query('exchange') exchange?: string,
    @Query('sectorCode') sectorCode?: string,
    @Query('icbCode') icbCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stocksService.search(
      q, exchange, sectorCode, icbCode,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan mã CK theo sàn/ngành' })
  getStats() {
    return this.stocksService.getStats();
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Chi tiết 1 mã chứng khoán' })
  findBySymbol(@Param('symbol') symbol: string) {
    return this.stocksService.findBySymbol(symbol);
  }
}
