import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListingService } from './listing.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Niêm yết')
@Public()
@Controller('listing')
export class ListingController {
  constructor(private listingService: ListingService) {}

  @Get('symbols')
  @ApiOperation({ summary: 'Lấy tất cả mã chứng khoán' })
  @ApiQuery({ name: 'group', required: false, description: 'Lọc theo nhóm (VN30, HOSE, HNX...)' })
  getSymbols(@Query('group') group?: string) {
    if (group) return this.listingService.getSymbolsByGroup(group);
    return this.listingService.getAllSymbols();
  }

  @Get('sectors')
  @ApiOperation({ summary: 'Danh sách tất cả ngành (KBS)' })
  getSectors() {
    return this.listingService.getSectors();
  }

  @Get('sectors/:code/stocks')
  @ApiOperation({ summary: 'Danh sách mã theo ngành' })
  getStocksBySector(@Param('code') code: string) {
    return this.listingService.getStocksBySector(Number(code));
  }

  @Get('icb')
  @ApiOperation({ summary: 'Phân ngành ICB - tất cả công ty (VCI)' })
  getIcbClassification() {
    return this.listingService.getIcbClassification();
  }

  @Get('icb/codes')
  @ApiOperation({ summary: 'Danh sách mã ngành ICB (VCI)' })
  getIcbCodes() {
    return this.listingService.getIcbCodes();
  }
}
