import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TradingService } from './trading.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Giao dịch')
@Public()
@Controller('trading')
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Post('price-board')
  @ApiOperation({ summary: 'Bảng giá realtime (bid/ask, giá khớp, KL)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          example: ['VCB', 'FPT', 'VNM'],
          description: 'Danh sách mã chứng khoán',
        },
      },
    },
  })
  getPriceBoard(@Body('symbols') symbols: string[]) {
    return this.tradingService.getPriceBoard(symbols || []);
  }

  @Get('indices')
  @ApiOperation({ summary: 'Chỉ số thị trường (VNINDEX, VN30, HNX...)' })
  getIndices() {
    return this.tradingService.getLatestIndices();
  }
}
