import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { FundamentalService } from './fundamental.service';

@ApiTags('Dữ liệu cơ bản')
@Controller('market-data/fundamental')
export class FundamentalController {
  constructor(private readonly service: FundamentalService) {}

  @Public()
  @Get(':symbol/financial-statement')
  @ApiOperation({ summary: 'Báo cáo tài chính VCI' })
  @ApiParam({ name: 'symbol', description: 'Mã chứng khoán' })
  @ApiQuery({
    name: 'section',
    required: false,
    enum: ['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'NOTE'],
  })
  getFinancialStatement(
    @Param('symbol') symbol: string,
    @Query('section') section?: string,
  ) {
    return this.service.getFinancialStatement(symbol, section);
  }

  @Public()
  @Get(':symbol/statistics-financial')
  @ApiOperation({ summary: 'Chỉ số tài chính thống kê' })
  @ApiParam({ name: 'symbol', description: 'Mã chứng khoán' })
  getStatisticsFinancial(@Param('symbol') symbol: string) {
    return this.service.getStatisticsFinancial(symbol);
  }

  @Public()
  @Get(':symbol/metrics')
  @ApiOperation({ summary: 'Từ điển chỉ số tài chính' })
  @ApiParam({ name: 'symbol', description: 'Mã chứng khoán' })
  getMetrics(@Param('symbol') symbol: string) {
    return this.service.getMetricsDictionary(symbol);
  }

  @Public()
  @Get(':symbol/mas-report')
  @ApiOperation({ summary: 'Báo cáo tài chính MAS' })
  @ApiParam({ name: 'symbol', description: 'Mã chứng khoán' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['CDKT', 'KQKD', 'LCTT', 'CSTC', 'CTKH'],
  })
  @ApiQuery({ name: 'termType', required: false, enum: ['Y', 'Q'] })
  getMasReport(
    @Param('symbol') symbol: string,
    @Query('type') type: string,
    @Query('termType') termType?: string,
  ) {
    return this.service.getMasFinancialReport(symbol, type, termType || 'Q');
  }

  @Public()
  @Get(':symbol/kbs-finance-info')
  @ApiOperation({ summary: 'Thông tin tài chính KBS (bao gồm CSTC)' })
  @ApiParam({ name: 'symbol', description: 'Mã chứng khoán' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['KQKD', 'CDKT', 'LCTT', 'CSTC', 'CTKH', 'BCTT'],
  })
  @ApiQuery({
    name: 'termtype',
    required: false,
    enum: ['1', '2'],
    description: '1=Năm, 2=Quý',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getKbsFinanceInfo(
    @Param('symbol') symbol: string,
    @Query('type') type: string,
    @Query('termtype') termtype?: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.service.getKbsFinanceInfo(
      symbol,
      type,
      termtype,
      page,
      pageSize,
    );
  }
}
