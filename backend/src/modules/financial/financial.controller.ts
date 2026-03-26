import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tài chính')
@Public()
@Controller('financial')
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @Get(':symbol/report')
  @ApiOperation({ summary: 'Báo cáo tài chính (CDKT, KQKD, LCTT, CSTC)' })
  @ApiQuery({
    name: 'type',
    description: 'Loại báo cáo: CDKT, KQKD, LCTT, CSTC',
    example: 'KQKD',
  })
  @ApiQuery({
    name: 'termType',
    required: false,
    description: '1 = năm, 2 = quý',
    example: '1',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Số kỳ',
    example: '4',
  })
  getReport(
    @Param('symbol') symbol: string,
    @Query('type') type: string,
    @Query('termType') termType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financialService.getReport(
      symbol,
      type || 'KQKD',
      Number(termType) || 1,
      Number(page) || 1,
      Number(pageSize) || 4,
    );
  }

  @Get(':symbol/ratios')
  @ApiOperation({ summary: 'Chỉ số tài chính (VCI GraphQL)' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Q = quý, Y = năm',
    example: 'Q',
  })
  getRatios(@Param('symbol') symbol: string, @Query('period') period?: string) {
    return this.financialService.getRatios(symbol, period || 'Q');
  }

  @Get('field-mapping')
  @ApiOperation({ summary: 'Mapping mã field → tên chỉ tiêu tài chính' })
  getFieldMapping() {
    return this.financialService.getFieldMapping();
  }
}
