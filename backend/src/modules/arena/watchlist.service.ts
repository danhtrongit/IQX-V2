import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, name: string, symbols: string[] = []) {
    const watchlist = await this.prisma.watchlist.create({
      data: {
        userId,
        name,
        symbols: symbols.map((s) => s.toUpperCase()),
      },
    });
    return { message: 'Tạo danh sách theo dõi thành công', data: watchlist };
  }

  async findAll(userId: string) {
    const lists = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { message: MESSAGES.COMMON.SUCCESS, data: lists };
  }

  async update(userId: string, id: string, data: { name?: string; symbols?: string[] }) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id, userId },
    });
    if (!watchlist) throw new NotFoundException('Không tìm thấy danh sách');

    const updated = await this.prisma.watchlist.update({
      where: { id },
      data: {
        name: data.name || watchlist.name,
        symbols: data.symbols ? data.symbols.map((s) => s.toUpperCase()) : watchlist.symbols,
      },
    });
    return { message: 'Cập nhật thành công', data: updated };
  }

  async addSymbol(userId: string, id: string, symbol: string) {
    const watchlist = await this.prisma.watchlist.findFirst({ where: { id, userId } });
    if (!watchlist) throw new NotFoundException('Không tìm thấy danh sách');

    const upper = symbol.toUpperCase();
    if (watchlist.symbols.includes(upper)) {
      return { message: `${upper} đã có trong danh sách`, data: watchlist };
    }

    const updated = await this.prisma.watchlist.update({
      where: { id },
      data: { symbols: { push: upper } },
    });
    return { message: `Đã thêm ${upper}`, data: updated };
  }

  async removeSymbol(userId: string, id: string, symbol: string) {
    const watchlist = await this.prisma.watchlist.findFirst({ where: { id, userId } });
    if (!watchlist) throw new NotFoundException('Không tìm thấy danh sách');

    const upper = symbol.toUpperCase();
    const updated = await this.prisma.watchlist.update({
      where: { id },
      data: { symbols: watchlist.symbols.filter((s: string) => s !== upper) },
    });
    return { message: `Đã xóa ${upper}`, data: updated };
  }

  async remove(userId: string, id: string) {
    const watchlist = await this.prisma.watchlist.findFirst({ where: { id, userId } });
    if (!watchlist) throw new NotFoundException('Không tìm thấy danh sách');

    await this.prisma.watchlist.delete({ where: { id } });
    return { message: 'Đã xóa danh sách theo dõi' };
  }
}
