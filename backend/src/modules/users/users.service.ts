import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        premiumExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    return {
      message: MESSAGES.USER.FOUND,
      data: user,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const data: any = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        premiumExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: MESSAGES.USER.UPDATED,
      data: user,
    };
  }

  // --- Admin endpoints ---

  async findAll(pagination: PaginationDto) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          premiumExpiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      message: MESSAGES.USER.LIST,
      data: {
        items: users,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / (pagination.limit ?? 10)),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        premiumExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { subscriptions: true, payments: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    return {
      message: MESSAGES.USER.FOUND,
      data: user,
    };
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    return {
      message: MESSAGES.USER.UPDATED,
      data: updated,
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    await this.prisma.user.delete({ where: { id } });

    return {
      message: MESSAGES.USER.DELETED,
      data: null,
    };
  }
}
