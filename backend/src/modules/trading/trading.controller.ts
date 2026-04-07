import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TradingService } from './trading.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  GetAllocatedIcbDetailDto,
  GetAllocatedIcbDto,
} from './dto/get-allocated-icb.dto';
import {
  GetAllSectorSignalsDto,
  GetSectorSignalDto,
} from './dto/get-sector-signal.dto';

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

  @Post('allocated-icb')
  @ApiOperation({
    summary: 'Phân bổ ICB theo nhóm thị trường và khung thời gian',
  })
  @ApiBody({ type: GetAllocatedIcbDto })
  getAllocatedIcb(@Body() payload: GetAllocatedIcbDto) {
    return this.tradingService.getAllocatedIcb(payload);
  }

  @Post('allocated-icb/detail')
  @ApiOperation({ summary: 'Chi tiết cổ phiếu thuộc một mã ICB' })
  @ApiBody({ type: GetAllocatedIcbDetailDto })
  getAllocatedIcbDetail(@Body() payload: GetAllocatedIcbDetailDto) {
    return this.tradingService.getAllocatedIcbDetail(payload);
  }

  @Post('sector-signals')
  @ApiOperation({
    summary: 'Phân loại trạng thái ngành theo D/W/M và thanh khoản',
  })
  @ApiBody({ type: GetSectorSignalDto })
  getSectorSignals(@Body() payload: GetSectorSignalDto): Promise<any> {
    return this.tradingService.getSectorSignals(payload);
  }

  @Post('sector-signals/all-levels')
  @ApiOperation({
    summary: 'Lấy toàn bộ trạng thái ngành ở mọi level theo D/W/M và thanh khoản',
  })
  @ApiBody({ type: GetAllSectorSignalsDto })
  getAllSectorSignals(@Body() payload: GetAllSectorSignalsDto): Promise<any> {
    return this.tradingService.getAllSectorSignals(payload);
  }

  @Get('indices')
  @ApiOperation({ summary: 'Chỉ số thị trường (VNINDEX, VN30, HNX...)' })
  getIndices() {
    return this.tradingService.getLatestIndices();
  }
}
