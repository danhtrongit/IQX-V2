import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TradingService } from '../trading/trading.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ArenaService {
  private readonly logger = new Logger(ArenaService.name);

  constructor(
    private prisma: PrismaService,
    private tradingService: TradingService,
  ) { }

  private getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getSettings() {
    let settings = await this.prisma.arenaSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await this.prisma.arenaSettings.create({
        data: { id: 'default' },
      });
    }
    return settings;
  }

  // ============ Account ============

  async activate(userId: string) {
    const settings = await this.getSettings();
    if (!settings.isActive) {
      throw new BadRequestException('Đấu trường ảo hiện đang tạm khóa');
    }

    const monthYear = this.getCurrentMonthYear();
    const existing = await this.prisma.virtualAccount.findUnique({
      where: { userId_monthYear: { userId, monthYear } },
    });

    if (existing) {
      return { message: 'Tài khoản đã được kích hoạt cho tháng này', data: existing };
    }

    const account = await this.prisma.virtualAccount.create({
      data: {
        userId,
        balance: settings.initialBalance,
        initialBalance: settings.initialBalance,
        monthYear,
        isActive: true,
      },
    });

    return { message: 'Kích hoạt đấu trường ảo thành công', data: account };
  }

  async getAccount(userId: string) {
    const monthYear = this.getCurrentMonthYear();
    const account = await this.prisma.virtualAccount.findUnique({
      where: { userId_monthYear: { userId, monthYear } },
      include: {
        portfolio: { orderBy: { symbol: 'asc' } },
        _count: { select: { orders: true } },
      },
    });

    if (!account) {
      throw new BadRequestException('Chưa kích hoạt đấu trường ảo. Vui lòng kích hoạt trước.');
    }

    const pendingOrders = await this.prisma.virtualOrder.count({
      where: { accountId: account.id, status: 'PENDING' },
    });

    const totalTrades = account.winTrades + account.lossTrades;
    const winRate = totalTrades > 0 ? (account.winTrades / totalTrades) * 100 : 0;
    const pnl = Number(account.balance) - Number(account.initialBalance);
    const pnlPercent = (pnl / Number(account.initialBalance)) * 100;

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        ...account,
        pnl: Math.round(pnl),
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        totalOrders: account._count.orders,
        pendingOrders,
      },
    };
  }

  // ============ Market Order ============

  async placeBuyOrder(userId: string, symbol: string, quantity: number) {
    const account = await this.getActiveAccount(userId);
    const settings = await this.getSettings();
    const price = await this.getCurrentPrice(symbol);

    return this.executeBuy(account, settings, symbol.toUpperCase(), quantity, price);
  }

  async placeSellOrder(userId: string, symbol: string, quantity: number) {
    const account = await this.getActiveAccount(userId);
    const settings = await this.getSettings();
    const price = await this.getCurrentPrice(symbol);

    return this.executeSell(account, settings, symbol.toUpperCase(), quantity, price);
  }

  // ============ Limit Order ============

  async placeLimitBuyOrder(userId: string, symbol: string, quantity: number, triggerPrice: number) {
    const account = await this.getActiveAccount(userId);
    const settings = await this.getSettings();

    // Validate: triggerPrice phải có
    if (!triggerPrice || triggerPrice <= 0) {
      throw new BadRequestException('Giá đặt lệnh giới hạn phải > 0');
    }

    // Pre-check balance (ước tính theo trigger price)
    const estimatedCost = triggerPrice * quantity * (1 + Number(settings.buyFeeRate));
    if (Number(account.balance) < estimatedCost) {
      throw new BadRequestException(
        `Số dư không đủ (ước tính). Cần ~${this.formatVnd(estimatedCost)}, có ${this.formatVnd(Number(account.balance))}`,
      );
    }

    // Lệnh hết hạn cuối ngày (14:45 VN time = 07:45 UTC)
    const expiresAt = this.getEndOfTradingDay();

    const order = await this.prisma.virtualOrder.create({
      data: {
        accountId: account.id,
        symbol: symbol.toUpperCase(),
        side: 'BUY',
        orderType: 'LIMIT',
        quantity,
        price: 0,
        triggerPrice,
        fee: 0,
        tax: 0,
        totalAmount: 0,
        status: 'PENDING',
        expiresAt,
      },
    });

    return {
      message: `Đặt lệnh LO MUA ${quantity} ${symbol.toUpperCase()} @ ${this.formatVnd(triggerPrice)} | Chờ khớp`,
      data: order,
    };
  }

  async placeLimitSellOrder(userId: string, symbol: string, quantity: number, triggerPrice: number) {
    const account = await this.getActiveAccount(userId);

    if (!triggerPrice || triggerPrice <= 0) {
      throw new BadRequestException('Giá đặt lệnh giới hạn phải > 0');
    }

    // Check portfolio
    const position = await this.prisma.virtualPortfolio.findUnique({
      where: { accountId_symbol: { accountId: account.id, symbol: symbol.toUpperCase() } },
    });

    if (!position || position.quantity < quantity) {
      throw new BadRequestException(
        `Không đủ cổ phiếu. Có ${position?.quantity || 0} ${symbol.toUpperCase()}, cần ${quantity}`,
      );
    }

    const expiresAt = this.getEndOfTradingDay();

    const order = await this.prisma.virtualOrder.create({
      data: {
        accountId: account.id,
        symbol: symbol.toUpperCase(),
        side: 'SELL',
        orderType: 'LIMIT',
        quantity,
        price: 0,
        triggerPrice,
        fee: 0,
        tax: 0,
        totalAmount: 0,
        status: 'PENDING',
        expiresAt,
      },
    });

    return {
      message: `Đặt lệnh LO BÁN ${quantity} ${symbol.toUpperCase()} @ ${this.formatVnd(triggerPrice)} | Chờ khớp`,
      data: order,
    };
  }

  /** Hủy lệnh chờ */
  async cancelOrder(userId: string, orderId: string) {
    const account = await this.getActiveAccount(userId);
    const order = await this.prisma.virtualOrder.findFirst({
      where: { id: orderId, accountId: account.id, status: 'PENDING' },
    });

    if (!order) {
      throw new BadRequestException('Không tìm thấy lệnh chờ');
    }

    const updated = await this.prisma.virtualOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', note: 'Hủy bởi user' },
    });

    return { message: `Đã hủy lệnh ${order.side} ${order.symbol}`, data: updated };
  }

  /** Lấy danh sách lệnh chờ */
  async getPendingOrders(userId: string) {
    const account = await this.getActiveAccount(userId);
    const orders = await this.prisma.virtualOrder.findMany({
      where: { accountId: account.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return { message: MESSAGES.COMMON.SUCCESS, data: orders };
  }

  // ============ Cron: Check Limit Orders ============

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleLimitOrders() {
    // Chỉ chạy trong giờ giao dịch (9:00 - 14:45 VN, = 2:00 - 7:45 UTC)
    const now = new Date();
    const vnHour = (now.getUTCHours() + 7) % 24;
    const vnMin = now.getUTCMinutes();

    if (vnHour < 9 || (vnHour === 14 && vnMin > 45) || vnHour > 14) {
      return;
    }

    const pendingOrders = await this.prisma.virtualOrder.findMany({
      where: { status: 'PENDING', orderType: 'LIMIT' },
      include: { account: true },
    });

    if (!pendingOrders.length) return;

    // Group by symbol for batch price fetch
    const symbols = [...new Set(pendingOrders.map((o: any) => o.symbol))];
    const priceMap = await this.getPriceMap(symbols);

    const settings = await this.getSettings();

    for (const order of pendingOrders) {
      try {
        const currentPrice = priceMap.get(order.symbol);
        if (!currentPrice) continue;

        const trigger = Number(order.triggerPrice);
        const shouldFill =
          (order.side === 'BUY' && currentPrice <= trigger) ||
          (order.side === 'SELL' && currentPrice >= trigger);

        if (!shouldFill) continue;

        // Execute
        if (order.side === 'BUY') {
          await this.executeBuy(order.account, settings, order.symbol, order.quantity, currentPrice, order.id);
        } else {
          await this.executeSell(order.account, settings, order.symbol, order.quantity, currentPrice, order.id);
        }

        this.logger.log(`✅ LO khớp: ${order.side} ${order.quantity} ${order.symbol} @ ${currentPrice}`);
      } catch (err: any) {
        this.logger.warn(`⚠ LO ${order.id} failed: ${err.message}`);
        // Reject order nếu không thể khớp
        await this.prisma.virtualOrder.update({
          where: { id: order.id },
          data: { status: 'REJECTED', note: err.message },
        });
      }
    }
  }

  @Cron('0 45 7 * * *') // 14:45 VN time = 07:45 UTC → hết phiên
  async cancelExpiredOrders() {
    const result = await this.prisma.virtualOrder.updateMany({
      where: {
        status: 'PENDING',
        orderType: 'LIMIT',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'CANCELLED', note: 'Hết phiên giao dịch' },
    });

    if (result.count > 0) {
      this.logger.log(`🔴 Đã hủy ${result.count} lệnh LO hết hạn`);
    }
  }

  // ============ Order History ============

  async getOrders(userId: string, page = 1, limit = 20, status?: string) {
    const account = await this.getActiveAccount(userId);
    const where: any = { accountId: account.id };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.virtualOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.virtualOrder.count({ where }),
    ]);

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPortfolio(userId: string) {
    const account = await this.getActiveAccount(userId);
    const portfolio = await this.prisma.virtualPortfolio.findMany({
      where: { accountId: account.id },
      orderBy: { symbol: 'asc' },
    });
    return { message: MESSAGES.COMMON.SUCCESS, data: portfolio };
  }

  // ============ Admin ============

  async updateSettings(data: {
    buyFeeRate?: number;
    sellFeeRate?: number;
    sellTaxRate?: number;
    tPlusDays?: number;
    initialBalance?: number;
    isActive?: boolean;
  }) {
    const settings = await this.prisma.arenaSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    return { message: 'Cập nhật cài đặt đấu trường thành công', data: settings };
  }

  async getSettings_() {
    const settings = await this.getSettings();
    return { message: MESSAGES.COMMON.SUCCESS, data: settings };
  }

  // ============ Execution Engine (shared by Market + Limit) ============

  private async executeBuy(
    account: any, settings: any, symbol: string, quantity: number, price: number, existingOrderId?: string,
  ) {
    const orderValue = price * quantity;
    const fee = orderValue * Number(settings.buyFeeRate);
    const totalCost = orderValue + fee;

    if (Number(account.balance) < totalCost) {
      throw new BadRequestException(
        `Số dư không đủ. Cần ${this.formatVnd(totalCost)}, có ${this.formatVnd(Number(account.balance))}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      let order: any;

      if (existingOrderId) {
        // Fill existing limit order
        order = await tx.virtualOrder.update({
          where: { id: existingOrderId },
          data: { price, fee, tax: 0, totalAmount: totalCost, status: 'FILLED', filledAt: new Date() },
        });
      } else {
        order = await tx.virtualOrder.create({
          data: {
            accountId: account.id,
            symbol,
            side: 'BUY',
            orderType: 'MARKET',
            quantity,
            price,
            fee,
            tax: 0,
            totalAmount: totalCost,
            status: 'FILLED',
            filledAt: new Date(),
          },
        });
      }

      await tx.virtualAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: totalCost },
          totalBuyAmount: { increment: orderValue },
          totalFees: { increment: fee },
        },
      });

      const existingPos = await tx.virtualPortfolio.findUnique({
        where: { accountId_symbol: { accountId: account.id, symbol } },
      });

      if (existingPos) {
        const newQty = existingPos.quantity + quantity;
        const newTotalInvested = Number(existingPos.totalInvested) + orderValue;
        await tx.virtualPortfolio.update({
          where: { id: existingPos.id },
          data: { quantity: newQty, avgBuyPrice: newTotalInvested / newQty, totalInvested: newTotalInvested },
        });
      } else {
        await tx.virtualPortfolio.create({
          data: { accountId: account.id, symbol, quantity, avgBuyPrice: price, totalInvested: orderValue },
        });
      }

      return order;
    });

    return {
      message: `Mua ${quantity} ${symbol} @ ${this.formatVnd(price)} thành công`,
      data: result,
    };
  }

  private async executeSell(
    account: any, settings: any, symbol: string, quantity: number, price: number, existingOrderId?: string,
  ) {
    const position = await this.prisma.virtualPortfolio.findUnique({
      where: { accountId_symbol: { accountId: account.id, symbol } },
    });

    if (!position || position.quantity < quantity) {
      throw new BadRequestException(
        `Không đủ cổ phiếu. Có ${position?.quantity || 0} ${symbol}, cần ${quantity}`,
      );
    }

    const orderValue = price * quantity;
    const fee = orderValue * Number(settings.sellFeeRate);
    const tax = orderValue * Number(settings.sellTaxRate);
    const netAmount = orderValue - fee - tax;

    const avgBuy = Number(position.avgBuyPrice);
    const isWin = price > avgBuy;

    const result = await this.prisma.$transaction(async (tx: any) => {
      let order: any;

      if (existingOrderId) {
        order = await tx.virtualOrder.update({
          where: { id: existingOrderId },
          data: { price, fee, tax, totalAmount: netAmount, status: 'FILLED', filledAt: new Date() },
        });
      } else {
        order = await tx.virtualOrder.create({
          data: {
            accountId: account.id,
            symbol,
            side: 'SELL',
            orderType: 'MARKET',
            quantity,
            price,
            fee,
            tax,
            totalAmount: netAmount,
            status: 'FILLED',
            filledAt: new Date(),
          },
        });
      }

      const updateData: any = {
        balance: { increment: netAmount },
        totalSellAmount: { increment: orderValue },
        totalFees: { increment: fee },
        totalTax: { increment: tax },
      };
      if (isWin) updateData.winTrades = { increment: 1 };
      else updateData.lossTrades = { increment: 1 };

      await tx.virtualAccount.update({ where: { id: account.id }, data: updateData });

      const remainQty = position.quantity - quantity;
      if (remainQty === 0) {
        await tx.virtualPortfolio.delete({ where: { id: position.id } });
      } else {
        const soldPortion = quantity / position.quantity;
        await tx.virtualPortfolio.update({
          where: { id: position.id },
          data: { quantity: remainQty, totalInvested: Number(position.totalInvested) * (1 - soldPortion) },
        });
      }

      return order;
    });

    const totalPnl = (price - avgBuy) * quantity;
    return {
      message: `Bán ${quantity} ${symbol} @ ${this.formatVnd(price)} | ${isWin ? 'Lãi' : 'Lỗ'} ${this.formatVnd(Math.abs(totalPnl))}`,
      data: { ...result, pnl: Math.round(totalPnl), avgBuyPrice: avgBuy },
    };
  }

  // ============ Helpers ============

  private async getActiveAccount(userId: string) {
    const monthYear = this.getCurrentMonthYear();
    const account = await this.prisma.virtualAccount.findUnique({
      where: { userId_monthYear: { userId, monthYear } },
    });
    if (!account || !account.isActive) {
      throw new BadRequestException('Chưa kích hoạt đấu trường ảo tháng này');
    }
    return account;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    const result = await this.tradingService.getPriceBoard([symbol.toUpperCase()]);
    const items: any[] = result?.data || [];
    if (!items.length || !items[0]?.closePrice) {
      throw new BadRequestException(`Không lấy được giá hiện tại cho ${symbol.toUpperCase()}`);
    }
    return items[0].closePrice;
  }

  private async getPriceMap(symbols: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    try {
      const result = await this.tradingService.getPriceBoard(symbols);
      const items: any[] = result?.data || [];
      for (const item of items) {
        if (item?.symbol && item?.closePrice) {
          map.set(item.symbol.toUpperCase(), item.closePrice);
        }
      }
    } catch {
      this.logger.warn('Failed to fetch price board for limit order matching');
    }
    return map;
  }

  private getEndOfTradingDay(): Date {
    const now = new Date();
    const endOfDay = new Date(now);
    // 14:45 VN = 07:45 UTC
    endOfDay.setUTCHours(7, 45, 0, 0);
    if (endOfDay <= now) {
      endOfDay.setDate(endOfDay.getDate() + 1);
    }
    return endOfDay;
  }

  private formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ';
  }
}
