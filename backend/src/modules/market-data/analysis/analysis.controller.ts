import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { AnalysisService } from './analysis.service';

@ApiTags('Phân tích chuyên sâu')
@Controller('market-data/analysis')
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Public()
  @Get('top-stocks')
  @ApiOperation({ summary: 'Top cổ phiếu theo tiêu chí (VNDIRECT)' })
  @ApiQuery({ name: 'q', required: true, description: 'Filter expression' })
  @ApiQuery({ name: 'size', required: false })
  @ApiQuery({ name: 'sort', required: false })
  getTopStocks(
    @Query('q') q: string,
    @Query('size') size?: number,
    @Query('sort') sort?: string,
  ) {
    return this.service.getTopStocks({ q, size, sort });
  }

  @Public()
  @Get('foreigns')
  @ApiOperation({ summary: 'Khối ngoại mua/bán ròng (VNDIRECT)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'size', required: false })
  @ApiQuery({ name: 'fields', required: false })
  getForeignFlows(
    @Query('q') q: string,
    @Query('sort') sort?: string,
    @Query('size') size?: number,
    @Query('fields') fields?: string,
  ) {
    return this.service.getForeignFlows({ q, sort, size, fields });
  }

  @Public()
  @Get('featured-news')
  @ApiOperation({ summary: 'Tin tuc noi bat tu nguon Tin co so' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'So luong tin toi da' })
  @ApiQuery({ name: 'language', required: false, description: 'vi | en' })
  getFeaturedNews(
    @Query('pageSize') pageSize?: string,
    @Query('language') language?: string,
  ) {
    return this.service.getFeaturedNews({
      pageSize: Number(pageSize) || 10,
      language: language || 'vi',
    });
  }

  @Public()
  @Get('screener/criteria')
  @ApiOperation({ summary: 'Tiêu chí lọc cổ phiếu (VCI Screener)' })
  getScreenerCriteria() {
    return this.service.getScreenerCriteria();
  }

  @Public()
  @Post('screener/search')
  @ApiOperation({ summary: 'Lọc cổ phiếu đa tiêu chí (VCI Screener)' })
  @ApiBody({ description: 'Filter payload with page, pageSize, filter array' })
  screenStocks(@Body() body: Record<string, unknown>) {
    return this.service.screenStocks(
      body as Parameters<AnalysisService['screenStocks']>[0],
    );
  }
}
