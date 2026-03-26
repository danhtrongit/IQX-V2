import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Doanh nghiệp')
@Public()
@Controller('company')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Get(':symbol/profile')
  @ApiOperation({ summary: 'Thông tin tổng quan doanh nghiệp' })
  getProfile(@Param('symbol') symbol: string) {
    return this.companyService.getProfile(symbol);
  }

  @Get(':symbol/price-info')
  @ApiOperation({ summary: 'Giá & chỉ số tài chính nhanh (VCI)' })
  getPriceInfo(@Param('symbol') symbol: string) {
    return this.companyService.getPriceInfo(symbol);
  }

  @Get(':symbol/shareholders')
  @ApiOperation({ summary: 'Cổ đông lớn' })
  getShareholders(@Param('symbol') symbol: string) {
    return this.companyService.getShareholders(symbol);
  }

  @Get(':symbol/managers')
  @ApiOperation({ summary: 'Ban lãnh đạo' })
  getManagers(@Param('symbol') symbol: string) {
    return this.companyService.getManagers(symbol);
  }

  @Get(':symbol/subsidiaries')
  @ApiOperation({ summary: 'Công ty con / liên kết' })
  getSubsidiaries(@Param('symbol') symbol: string) {
    return this.companyService.getSubsidiaries(symbol);
  }

  @Get(':symbol/events')
  @ApiOperation({ summary: 'Sự kiện doanh nghiệp' })
  getEvents(@Param('symbol') symbol: string) {
    return this.companyService.getEvents(symbol);
  }

  @Get(':symbol/news')
  @ApiOperation({ summary: 'Tin tức doanh nghiệp' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getNews(
    @Param('symbol') symbol: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companyService.getNews(
      symbol,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get(':symbol/internal-trading')
  @ApiOperation({ summary: 'Giao dịch nội bộ (KBS)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getInternalTrading(
    @Param('symbol') symbol: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companyService.getInternalTrading(
      symbol,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  // ============================================================
  //  VCI IQ Insight — Nước ngoài / Tự doanh / Nội bộ / Cung cầu
  // ============================================================

  @Get(':symbol/foreign-flow')
  @ApiOperation({ summary: 'Dòng tiền nước ngoài (VCI IQ Insight)' })
  @ApiQuery({
    name: 'timeFrame',
    required: false,
    description: 'D | W | M | Q | Y',
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'toDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  getForeignFlow(
    @Param('symbol') symbol: string,
    @Query('timeFrame') timeFrame?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.companyService.getForeignFlow(
      symbol,
      timeFrame || 'D',
      fromDate,
      toDate,
      Number(page) || 0,
      Number(size) || 50,
    );
  }

  @Get(':symbol/proprietary-flow')
  @ApiOperation({ summary: 'Dòng tiền tự doanh (VCI IQ Insight)' })
  @ApiQuery({
    name: 'timeFrame',
    required: false,
    description: 'D | W | M | Q | Y',
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'toDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  getProprietaryFlow(
    @Param('symbol') symbol: string,
    @Query('timeFrame') timeFrame?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.companyService.getProprietaryFlow(
      symbol,
      timeFrame || 'D',
      fromDate,
      toDate,
      Number(page) || 0,
      Number(size) || 50,
    );
  }

  @Get(':symbol/insider-transactions')
  @ApiOperation({
    summary: 'Giao dịch nội bộ chi tiết (VCI IQ + KBS fallback)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  getInsiderTransactions(
    @Param('symbol') symbol: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.companyService.getInsiderTransactions(
      symbol,
      Number(page) || 0,
      Number(size) || 50,
    );
  }

  @Get(':symbol/supply-demand')
  @ApiOperation({
    summary: 'Cung cầu — dữ liệu đặt lệnh & chưa khớp (VCI IQ Insight)',
  })
  @ApiQuery({
    name: 'timeFrame',
    required: false,
    description: 'D | W | M | Q | Y',
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'toDate', required: false, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  getSupplyDemand(
    @Param('symbol') symbol: string,
    @Query('timeFrame') timeFrame?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.companyService.getSupplyDemand(
      symbol,
      timeFrame || 'D',
      fromDate,
      toDate,
      Number(page) || 0,
      Number(size) || 50,
    );
  }
}
