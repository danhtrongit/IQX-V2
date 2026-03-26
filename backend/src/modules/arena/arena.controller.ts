import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ArenaService } from './arena.service';
import { LeaderboardService } from './leaderboard.service';
import { WatchlistService } from './watchlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Đấu trường ảo')
@ApiBearerAuth()
@Controller('arena')
export class ArenaController {
  constructor(
    private arenaService: ArenaService,
    private leaderboardService: LeaderboardService,
  ) {}

  // ============ Account ============

  @Post('activate')
  @ApiOperation({ summary: 'Kích hoạt tài khoản đấu trường ảo (Premium)' })
  activate(@CurrentUser() user: any) {
    return this.arenaService.activate(user.sub);
  }

  @Get('account')
  @ApiOperation({ summary: 'Thông tin tài khoản (balance, P&L, win rate)' })
  getAccount(@CurrentUser() user: any) {
    return this.arenaService.getAccount(user.sub);
  }

  // ============ Market Orders ============

  @Post('orders/buy')
  @ApiOperation({ summary: 'Lệnh MUA ngay (Market Order)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'VCB' },
        quantity: { type: 'number', example: 100 },
      },
    },
  })
  placeBuyOrder(
    @CurrentUser() user: any,
    @Body('symbol') symbol: string,
    @Body('quantity') quantity: number,
  ) {
    return this.arenaService.placeBuyOrder(user.sub, symbol, quantity);
  }

  @Post('orders/sell')
  @ApiOperation({ summary: 'Lệnh BÁN ngay (Market Order)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'VCB' },
        quantity: { type: 'number', example: 100 },
      },
    },
  })
  placeSellOrder(
    @CurrentUser() user: any,
    @Body('symbol') symbol: string,
    @Body('quantity') quantity: number,
  ) {
    return this.arenaService.placeSellOrder(user.sub, symbol, quantity);
  }

  // ============ Limit Orders ============

  @Post('orders/limit-buy')
  @ApiOperation({ summary: 'Lệnh giới hạn MUA (Limit Order) - chờ khớp khi giá ≤ triggerPrice' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'VCB' },
        quantity: { type: 'number', example: 100 },
        triggerPrice: { type: 'number', example: 55.5, description: 'Giá mong muốn (nghìn đồng)' },
      },
    },
  })
  placeLimitBuy(
    @CurrentUser() user: any,
    @Body('symbol') symbol: string,
    @Body('quantity') quantity: number,
    @Body('triggerPrice') triggerPrice: number,
  ) {
    return this.arenaService.placeLimitBuyOrder(user.sub, symbol, quantity, triggerPrice);
  }

  @Post('orders/limit-sell')
  @ApiOperation({ summary: 'Lệnh giới hạn BÁN (Limit Order) - chờ khớp khi giá ≥ triggerPrice' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'VCB' },
        quantity: { type: 'number', example: 100 },
        triggerPrice: { type: 'number', example: 62.0, description: 'Giá mong muốn (nghìn đồng)' },
      },
    },
  })
  placeLimitSell(
    @CurrentUser() user: any,
    @Body('symbol') symbol: string,
    @Body('quantity') quantity: number,
    @Body('triggerPrice') triggerPrice: number,
  ) {
    return this.arenaService.placeLimitSellOrder(user.sub, symbol, quantity, triggerPrice);
  }

  @Delete('orders/:id')
  @ApiOperation({ summary: 'Hủy lệnh chờ (Limit Order)' })
  cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.arenaService.cancelOrder(user.sub, id);
  }

  @Get('orders/pending')
  @ApiOperation({ summary: 'Danh sách lệnh chờ khớp' })
  getPendingOrders(@CurrentUser() user: any) {
    return this.arenaService.getPendingOrders(user.sub);
  }

  // ============ Order History ============

  @Get('orders')
  @ApiOperation({ summary: 'Lịch sử lệnh (tất cả hoặc lọc theo status)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'PENDING, FILLED, CANCELLED, REJECTED' })
  getOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.arenaService.getOrders(user.sub, Number(page) || 1, Number(limit) || 20, status);
  }

  // ============ Portfolio ============

  @Get('portfolio')
  @ApiOperation({ summary: 'Danh mục đầu tư hiện tại' })
  getPortfolio(@CurrentUser() user: any) {
    return this.arenaService.getPortfolio(user.sub);
  }

  // ============ Leaderboard ============

  @Public()
  @Get('leaderboard')
  @ApiOperation({ summary: 'Bảng xếp hạng' })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM', example: '2026-03' })
  @ApiQuery({ name: 'metric', required: false, description: 'pnl, totalAssets, pnlPercent, winRate, totalOrders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getLeaderboard(
    @Query('month') month?: string,
    @Query('metric') metric?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getLeaderboard(month, metric || 'pnl', Number(page) || 1, Number(limit) || 20);
  }

  @Get('leaderboard/me')
  @ApiOperation({ summary: 'Vị trí của tôi trong BXH' })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'metric', required: false })
  getMyRank(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('metric') metric?: string,
  ) {
    return this.leaderboardService.getMyRank(user.sub, month, metric || 'pnl');
  }

  // ============ Admin Settings ============

  @Roles('ADMIN')
  @Get('settings')
  @ApiOperation({ summary: '[Admin] Lấy cài đặt đấu trường' })
  getSettings() {
    return this.arenaService.getSettings_();
  }

  @Roles('ADMIN')
  @Patch('settings')
  @ApiOperation({ summary: '[Admin] Cập nhật cài đặt đấu trường' })
  updateSettings(@Body() data: any) {
    return this.arenaService.updateSettings(data);
  }
}

// ============ Watchlist Controller ============

@ApiTags('Theo dõi (Watchlist)')
@ApiBearerAuth()
@Controller('watchlist')
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo danh sách theo dõi' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Ngân hàng yêu thích' },
        symbols: { type: 'array', items: { type: 'string' }, example: ['VCB', 'ACB', 'BID'] },
      },
    },
  })
  create(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('symbols') symbols?: string[],
  ) {
    return this.watchlistService.create(user.sub, name, symbols);
  }

  @Get()
  @ApiOperation({ summary: 'Tất cả danh sách theo dõi' })
  findAll(@CurrentUser() user: any) {
    return this.watchlistService.findAll(user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật danh sách' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { name?: string; symbols?: string[] },
  ) {
    return this.watchlistService.update(user.sub, id, data);
  }

  @Post(':id/symbols')
  @ApiOperation({ summary: 'Thêm mã vào danh sách' })
  @ApiBody({ schema: { type: 'object', properties: { symbol: { type: 'string', example: 'FPT' } } } })
  addSymbol(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('symbol') symbol: string,
  ) {
    return this.watchlistService.addSymbol(user.sub, id, symbol);
  }

  @Delete(':id/symbols/:symbol')
  @ApiOperation({ summary: 'Xóa mã khỏi danh sách' })
  removeSymbol(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('symbol') symbol: string,
  ) {
    return this.watchlistService.removeSymbol(user.sub, id, symbol);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh sách theo dõi' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.watchlistService.remove(user.sub, id);
  }
}
