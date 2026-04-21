import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiInsightService } from './ai-insight.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI Insight')
@Public()
@Controller('ai-insight')
export class AiInsightController {
  constructor(private aiInsightService: AiInsightService) {}

  @Get(':symbol')
  @ApiOperation({
    summary: 'Phân tích AI 6 lớp cho mã cổ phiếu',
    description:
      'Chạy phân tích 6 lớp: Xu hướng → Thanh khoản → Dòng tiền → Nội bộ → Tin tức → Tổng hợp hành động',
  })
  analyze(@Param('symbol') symbol: string) {
    return this.aiInsightService.analyze(symbol);
  }
}
