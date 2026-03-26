import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  /** Tìm kiếm mã CK (full-text trên symbol + name) */
  async search(query?: string, exchange?: string, sectorCode?: string, icbCode?: string, page = 1, limit = 20) {
    const where: any = {};

    if (query) {
      where.OR = [
        { symbol: { contains: query.toUpperCase(), mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (exchange) {
      where.exchange = exchange.toUpperCase();
    }

    if (sectorCode) {
      where.sectorCode = sectorCode;
    }

    if (icbCode) {
      where.OR = [
        ...(where.OR || []),
        { icbCode1: icbCode },
        { icbCode2: icbCode },
        { icbCode3: icbCode },
        { icbCode4: icbCode },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { symbol: 'asc' },
        skip,
        take: limit,
        select: {
          symbol: true,
          name: true,
          nameEn: true,
          exchange: true,
          type: true,
          sectorCode: true,
          sectorName: true,
          icbCode3: true,
          icbName3: true,
          enIcbName3: true,
          comTypeCode: true,
        },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Chi tiết 1 mã CK */
  async findBySymbol(symbol: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!stock) {
      return { message: 'Không tìm thấy mã chứng khoán', data: null };
    }

    return { message: MESSAGES.COMMON.SUCCESS, data: stock };
  }

  /** Thống kê tổng quan */
  async getStats() {
    const [total, byExchange, bySector] = await Promise.all([
      this.prisma.stock.count(),
      this.prisma.stock.groupBy({ by: ['exchange'], _count: true }),
      this.prisma.sector.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        total,
        byExchange: byExchange.map((e: any) => ({ exchange: e.exchange, count: e._count })),
        sectors: bySector,
      },
    };
  }
}
