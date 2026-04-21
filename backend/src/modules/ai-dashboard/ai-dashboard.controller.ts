import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AiDashboardService } from './ai-dashboard.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI Dashboard')
@Public()
@Controller('ai-dashboard')
export class AiDashboardController {
  constructor(private aiDashboardService: AiDashboardService) {}

  @Get('sector/:group/:icbCode')
  @ApiOperation({
    summary: 'Phân tích AI cho 1 ngành ICB',
    description:
      'Trả về 8 dòng phân tích ngành: Trạng thái, Hiệu suất, Dòng tiền, Độ rộng, Dẫn dắt, Điểm yếu, Cơ hội, Rủi ro',
  })
  @ApiParam({ name: 'group', example: 'HOSE', description: 'Nhóm thị trường' })
  @ApiParam({ name: 'icbCode', example: 2700, description: 'Mã ngành ICB' })
  analyzeSector(
    @Param('group') group: string,
    @Param('icbCode') icbCode: string,
  ) {
    return this.aiDashboardService.analyzeSector(group, Number(icbCode));
  }

  @Get('sectors/:group')
  @ApiOperation({
    summary: 'Phân tích AI cho tất cả ngành đã phân loại',
    description:
      'Trả về phân tích 8 dòng cho tất cả ngành đang có nhãn Dẫn sóng/Hút tiền/Tích lũy/Phân phối/Hồi kỹ thuật/Suy yếu',
  })
  @ApiParam({ name: 'group', example: 'HOSE', description: 'Nhóm thị trường' })
  analyzeAllSectors(@Param('group') group: string) {
    return this.aiDashboardService.analyzeAllSectors(group);
  }
}
