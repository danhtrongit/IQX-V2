import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ReferenceService } from './reference.service';

@ApiTags('Dữ liệu tham chiếu')
@Controller('market-data/reference')
export class ReferenceController {
  constructor(private readonly service: ReferenceService) {}

  @Public()
  @Get('search-bar')
  @ApiOperation({ summary: 'Tìm kiếm công ty/ngành' })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: ['1', '2'],
    description: '1=Vietnamese, 2=English',
  })
  searchBar(@Query('language') language?: string) {
    return this.service.searchBar(language ? Number(language) : 1);
  }

  @Public()
  @Get('events')
  @ApiOperation({ summary: 'Lịch sự kiện doanh nghiệp' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'toDate', required: true, description: 'YYYYMMDD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  @ApiQuery({
    name: 'eventCode',
    required: false,
    description: 'e.g., ISS,DIV',
  })
  getEvents(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('eventCode') eventCode?: string,
  ) {
    return this.service.getEvents({ fromDate, toDate, page, size, eventCode });
  }

  @Public()
  @Get('market-status')
  @ApiOperation({ summary: 'Trạng thái thị trường (MAS)' })
  getMarketStatus() {
    return this.service.getMarketStatus();
  }

  @Public()
  @Get('dukascopy/instruments')
  @ApiOperation({ summary: 'Danh mục instruments quốc tế (Dukascopy)' })
  getDukascopyInstruments() {
    return this.service.getDukascopyInstruments();
  }
}
