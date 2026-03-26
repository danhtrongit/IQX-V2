import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiNewsService } from './ai-news.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI News')
@Public()
@Controller('ai-news')
export class AiNewsController {
  constructor(private aiNewsService: AiNewsService) {}

  // ============================================================
  //  Tin Doanh Nghiệp (Market + Company)
  // ============================================================

  @Get('news')
  @ApiOperation({ summary: 'Tin doanh nghiệp — market hoặc theo mã CP' })
  @ApiQuery({
    name: 'ticker',
    required: false,
    description: 'Mã CP (VNM, VCI...). Để trống = tin thị trường',
  })
  @ApiQuery({
    name: 'industry',
    required: false,
    description: 'Slug ngành (real-estate, food-and-beverage...)',
  })
  @ApiQuery({
    name: 'sentiment',
    required: false,
    description: 'Positive | Neutral | Negative',
  })
  @ApiQuery({
    name: 'newsfrom',
    required: false,
    description: 'Slug nguồn tin (vietstock, cafef...)',
  })
  @ApiQuery({ name: 'updateFrom', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'updateTo', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'language', required: false, description: 'vi | en' })
  getNews(
    @Query('ticker') ticker?: string,
    @Query('industry') industry?: string,
    @Query('sentiment') sentiment?: string,
    @Query('newsfrom') newsfrom?: string,
    @Query('updateFrom') updateFrom?: string,
    @Query('updateTo') updateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('language') language?: string,
  ) {
    return this.aiNewsService.getNews({
      ticker,
      industry,
      sentiment,
      newsfrom,
      updateFrom,
      updateTo,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 12,
      language: language || 'vi',
    });
  }

  // ============================================================
  //  Tin Từ Sở (Exchange News)
  // ============================================================

  @Get('exchange-news')
  @ApiOperation({ summary: 'Tin từ Sở (HOSE/HNX) — theo mã CP' })
  @ApiQuery({ name: 'ticker', required: false })
  @ApiQuery({ name: 'newsfrom', required: false })
  @ApiQuery({ name: 'updateFrom', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'updateTo', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'language', required: false })
  getExchangeNews(
    @Query('ticker') ticker?: string,
    @Query('newsfrom') newsfrom?: string,
    @Query('updateFrom') updateFrom?: string,
    @Query('updateTo') updateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('language') language?: string,
  ) {
    return this.aiNewsService.getExchangeNews({
      ticker,
      newsfrom,
      updateFrom,
      updateTo,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 12,
      language: language || 'vi',
    });
  }

  // ============================================================
  //  Article Detail — Nội dung chi tiết bài viết
  // ============================================================

  @Get('article/:slug')
  @ApiOperation({ summary: 'Chi tiết bài viết (nội dung HTML đầy đủ)' })
  @ApiQuery({ name: 'language', required: false })
  getArticle(
    @Param('slug') slug: string,
    @Query('language') language?: string,
  ) {
    return this.aiNewsService.getArticle(slug, language || 'vi');
  }

  // ============================================================
  //  Ticker Score — Điểm AI & Tóm tắt 5 ngày
  // ============================================================

  @Get('ticker-score/:ticker')
  @ApiOperation({ summary: 'Điểm AI & tóm tắt tin 5 ngày gần đây' })
  @ApiQuery({ name: 'language', required: false })
  getTickerScore(
    @Param('ticker') ticker: string,
    @Query('language') language?: string,
  ) {
    return this.aiNewsService.getTickerScore(ticker, language || 'vi');
  }

  // ============================================================
  //  Filter Options — Danh mục ngành, nguồn tin
  // ============================================================

  @Get('industries')
  @ApiOperation({ summary: 'Danh mục ngành (cho bộ lọc)' })
  @ApiQuery({ name: 'language', required: false })
  getIndustries(@Query('language') language?: string) {
    return this.aiNewsService.getIndustries(language || 'vi');
  }

  @Get('sources')
  @ApiOperation({ summary: 'Danh mục nguồn tin (cho bộ lọc)' })
  @ApiQuery({ name: 'language', required: false })
  getSources(@Query('language') language?: string) {
    return this.aiNewsService.getSources(language || 'vi');
  }
}
