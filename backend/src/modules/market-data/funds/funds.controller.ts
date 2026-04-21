import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { FundsService } from './funds.service';

@ApiTags('Quỹ đầu tư')
@Controller('market-data/funds')
export class FundsController {
  constructor(private readonly service: FundsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách quỹ (FMARKET)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  listFunds(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.service.listFunds({ page, pageSize, sortField, sortOrder });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết quỹ' })
  @ApiParam({ name: 'id', type: Number })
  getFundDetail(@Param('id') id: number) {
    return this.service.getFundDetail(id);
  }

  @Public()
  @Get(':id/nav-history')
  @ApiOperation({ summary: 'Lịch sử NAV quỹ' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'toDate', required: false, description: 'YYYYMMDD' })
  getNavHistory(@Param('id') id: number, @Query('toDate') toDate?: string) {
    return this.service.getNavHistory(id, toDate);
  }
}
