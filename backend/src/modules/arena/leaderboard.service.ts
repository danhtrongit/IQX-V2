import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TradingService } from '../trading/trading.service';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    private tradingService: TradingService,
  ) {}

  /** BXH theo tháng + metric */
  async getLeaderboard(
    monthYear?: string,
    metric: string = 'pnl',
    page = 1,
    limit = 20,
  ) {
    const my = monthYear || this.getCurrentMonthYear();

    const accounts = await this.prisma.virtualAccount.findMany({
      where: { monthYear: my },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        portfolio: true,
        _count: { select: { orders: true } },
      },
    });

    const ranked = accounts.map((acc: any) => {
      const balance = Number(acc.balance);
      const initial = Number(acc.initialBalance);
      const portfolioValue = acc.portfolio.reduce(
        (sum: number, p: any) => sum + Number(p.avgBuyPrice) * p.quantity,
        0,
      );
      const totalAssets = balance + portfolioValue;
      const pnl = totalAssets - initial;
      const pnlPercent = initial > 0 ? (pnl / initial) * 100 : 0;
      const totalTrades = acc.winTrades + acc.lossTrades;
      const winRate = totalTrades > 0 ? (acc.winTrades / totalTrades) * 100 : 0;

      return {
        userId: acc.userId,
        fullName: acc.user.fullName || acc.user.email.split('@')[0],
        balance: Math.round(balance),
        portfolioValue: Math.round(portfolioValue),
        totalAssets: Math.round(totalAssets),
        pnl: Math.round(pnl),
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        winTrades: acc.winTrades,
        lossTrades: acc.lossTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalOrders: acc._count.orders,
      };
    });

    // Sort by metric
    const sortFn = this.getSortFn(metric);
    ranked.sort(sortFn);

    // Add rank
    const withRank = ranked.map((item: any, index: number) => ({
      rank: index + 1,
      ...item,
    }));

    // Paginate
    const start = (page - 1) * limit;
    const items = withRank.slice(start, start + limit);

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: items,
      pagination: {
        page,
        limit,
        total: withRank.length,
        totalPages: Math.ceil(withRank.length / limit),
      },
      meta: { monthYear: my, metric },
    };
  }

  /** Vị trí của tôi trong BXH */
  async getMyRank(userId: string, monthYear?: string, metric = 'pnl') {
    const result = await this.getLeaderboard(monthYear, metric, 1, 9999);
    const myPosition = result.data.find((item: any) => item.userId === userId);

    if (!myPosition) {
      return { message: 'Chưa tham gia đấu trường tháng này', data: null };
    }

    return { message: MESSAGES.COMMON.SUCCESS, data: myPosition };
  }

  private getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getSortFn(metric: string) {
    const sorts: Record<string, (a: any, b: any) => number> = {
      pnl: (a, b) => b.pnl - a.pnl,
      totalAssets: (a, b) => b.totalAssets - a.totalAssets,
      pnlPercent: (a, b) => b.pnlPercent - a.pnlPercent,
      winRate: (a, b) => b.winRate - a.winRate,
      totalOrders: (a, b) => b.totalOrders - a.totalOrders,
    };
    return sorts[metric] || sorts.pnl;
  }
}
