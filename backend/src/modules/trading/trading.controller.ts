import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Gán nhãn tín hiệu dòng tiền cho 1 ngành ICB' })
  @ApiBody({ type: GetSectorSignalDto })
  getSectorSignals(@Body() payload: GetSectorSignalDto) {
    return this.tradingService.getSectorSignals(payload);
  }

  @Get('sector-signals')
  @ApiOperation({
    summary:
      'Gán nhãn tín hiệu dòng tiền cho 1 ngành ICB (GET với query params)',
  })
  @ApiQuery({ name: 'group', required: true, example: 'HOSE' })
  @ApiQuery({ name: 'icb_code', required: true, example: 2700 })
  getSectorSignalsGet(@Query() query: GetSectorSignalDto) {
    return this.tradingService.getSectorSignals(query);
  }

  @Post('sector-signals/all-levels')
  @ApiOperation({
    summary:
      'Danh sách ngành thỏa điều kiện theo các nhãn Dẫn sóng/Hút tiền/Tích lũy/Phân phối/Hồi kỹ thuật/Suy yếu',
  })
  @ApiBody({ type: GetAllSectorSignalsDto })
  getAllSectorSignals(@Body() payload: GetAllSectorSignalsDto) {
    return this.tradingService.getAllSectorSignals(payload);
  }

  @Get('sector-signals/all-levels')
  @ApiOperation({
    summary:
      'Danh sách ngành thỏa điều kiện theo các nhãn (GET với query params)',
  })
  @ApiQuery({ name: 'group', required: true, example: 'HOSE' })
  @ApiQuery({
    name: 'applyTopLimit',
    required: false,
    example: false,
    description:
      'false để lấy toàn bộ mã thỏa nhãn, không giới hạn top 1/2/3 cho Dẫn sóng/Hút tiền/Tích lũy',
  })
  @ApiQuery({
    name: 'debug',
    required: false,
    example: true,
    description:
      'true để trả thêm debugInputs: toàn bộ dữ liệu đầu vào ngành level 1-2 theo icb-codes.json',
  })
  getAllSectorSignalsGet(@Query() query: GetAllSectorSignalsDto) {
    return this.tradingService.getAllSectorSignals(query);
  }

  @Get('indices')
  @ApiOperation({ summary: 'Chỉ số thị trường (VNINDEX, VN30, HNX...)' })
  getIndices() {
    return this.tradingService.getLatestIndices();
  }
}
