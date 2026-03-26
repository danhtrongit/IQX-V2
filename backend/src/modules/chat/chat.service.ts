import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMemberRole, ChatRoomType, MessageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ================== ROOMS ==================

  async createRoom(userId: string, dto: CreateRoomDto) {
    const room = await this.prisma.chatRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: (dto.type as ChatRoomType) || ChatRoomType.GROUP,
        avatar: dto.avatar,
        createdById: userId,
        members: {
          create: [
            { userId, role: ChatMemberRole.OWNER },
            ...(dto.memberIds || [])
              .filter((id) => id !== userId)
              .map((id) => ({ userId: id, role: ChatMemberRole.MEMBER })),
          ],
        },
      },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        _count: { select: { messages: true, members: true } },
      },
    });

    return { message: MESSAGES.CHAT.ROOM_CREATED, data: room };
  }

  async getUserRooms(userId: string, pagination: PaginationDto) {
    const where = { members: { some: { userId } } };

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          members: {
            include: { user: { select: this.userSelect } },
            take: 5,
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: this.userSelect } },
          },
          _count: { select: { messages: true, members: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const membership = await this.prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId: room.id, userId } },
        });

        const unreadCount = membership?.lastReadAt
          ? await this.prisma.chatMessage.count({
              where: {
                roomId: room.id,
                createdAt: { gt: membership.lastReadAt },
                senderId: { not: userId },
                isDeleted: false,
              },
            })
          : room._count.messages;

        return { ...room, unreadCount };
      }),
    );

    return {
      message: MESSAGES.CHAT.ROOMS_LISTED,
      data: roomsWithUnread,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / (pagination.limit ?? 10)),
      },
    };
  }

  async getRoomById(userId: string, roomId: string) {
    await this.assertMembership(roomId, userId);

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: this.userSelect } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { messages: true, members: true } },
      },
    });

    if (!room) throw new NotFoundException(MESSAGES.CHAT.ROOM_NOT_FOUND);

    return { message: MESSAGES.CHAT.ROOM_FOUND, data: room };
  }

  async updateRoom(userId: string, roomId: string, dto: UpdateRoomDto) {
    await this.assertMemberRole(roomId, userId, [
      ChatMemberRole.OWNER,
      ChatMemberRole.ADMIN,
    ]);

    const updated = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: dto,
      include: {
        members: { include: { user: { select: this.userSelect } } },
        _count: { select: { messages: true, members: true } },
      },
    });

    return { message: MESSAGES.CHAT.ROOM_UPDATED, data: updated };
  }

  async deleteRoom(userId: string, roomId: string) {
    await this.assertMemberRole(roomId, userId, [ChatMemberRole.OWNER]);

    await this.prisma.chatRoom.delete({ where: { id: roomId } });

    return { message: MESSAGES.CHAT.ROOM_DELETED };
  }

  async getOrCreateDirectRoom(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException(MESSAGES.CHAT.CANNOT_DM_SELF);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new NotFoundException(MESSAGES.USER.NOT_FOUND);

    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.DIRECT,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: this.userSelect } },
        },
        _count: { select: { messages: true, members: true } },
      },
    });

    if (existing) {
      return { message: MESSAGES.CHAT.ROOM_FOUND, data: existing };
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.DIRECT,
        createdById: userId,
        members: {
          create: [
            { userId, role: ChatMemberRole.MEMBER },
            { userId: targetUserId, role: ChatMemberRole.MEMBER },
          ],
        },
      },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        _count: { select: { messages: true, members: true } },
      },
    });

    return { message: MESSAGES.CHAT.ROOM_CREATED, data: room };
  }

  // ================== MEMBERS ==================

  async addMembers(userId: string, roomId: string, userIds: string[]) {
    await this.assertMemberRole(roomId, userId, [
      ChatMemberRole.OWNER,
      ChatMemberRole.ADMIN,
    ]);

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (room?.type === ChatRoomType.DIRECT) {
      throw new BadRequestException(MESSAGES.CHAT.CANNOT_ADD_TO_DIRECT);
    }

    const existing = await this.prisma.chatRoomMember.findMany({
      where: { roomId, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const newIds = userIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      throw new BadRequestException(MESSAGES.CHAT.MEMBERS_ALREADY_EXIST);
    }

    await this.prisma.chatRoomMember.createMany({
      data: newIds.map((id) => ({
        roomId,
        userId: id,
        role: ChatMemberRole.MEMBER,
      })),
    });

    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      include: { user: { select: this.userSelect } },
    });

    return { message: MESSAGES.CHAT.MEMBERS_ADDED, data: members };
  }

  async removeMember(userId: string, roomId: string, targetUserId: string) {
    if (userId !== targetUserId) {
      await this.assertMemberRole(roomId, userId, [
        ChatMemberRole.OWNER,
        ChatMemberRole.ADMIN,
      ]);
    }

    const membership = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!membership)
      throw new NotFoundException(MESSAGES.CHAT.MEMBER_NOT_FOUND);

    if (membership.role === ChatMemberRole.OWNER) {
      throw new ForbiddenException(MESSAGES.CHAT.CANNOT_REMOVE_OWNER);
    }

    await this.prisma.chatRoomMember.delete({
      where: { id: membership.id },
    });

    return { message: MESSAGES.CHAT.MEMBER_REMOVED };
  }

  // ================== MESSAGES ==================

  async sendMessage(userId: string, roomId: string, dto: SendMessageDto) {
    await this.assertMembership(roomId, userId);

    if (!dto.content && !dto.fileUrl) {
      throw new BadRequestException(MESSAGES.CHAT.EMPTY_MESSAGE);
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        content: dto.content,
        type: (dto.type as MessageType) || MessageType.TEXT,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        replyToId: dto.replyToId,
      },
      include: {
        sender: { select: this.userSelect },
        replyTo: {
          include: { sender: { select: this.userSelect } },
        },
        reactions: {
          include: { user: { select: this.userSelect } },
        },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    await this.prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    return message;
  }

  async getMessages(userId: string, roomId: string, pagination: PaginationDto) {
    await this.assertMembership(roomId, userId);

    const where = { roomId, isDeleted: false };

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        include: {
          sender: { select: this.userSelect },
          replyTo: {
            include: { sender: { select: this.userSelect } },
          },
          reactions: {
            include: { user: { select: this.userSelect } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    return {
      message: MESSAGES.CHAT.MESSAGES_LISTED,
      data: messages.reverse(),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / (pagination.limit ?? 10)),
      },
    };
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException(MESSAGES.CHAT.MESSAGE_NOT_FOUND);
    if (message.senderId !== userId) {
      throw new ForbiddenException(MESSAGES.CHAT.NOT_MESSAGE_OWNER);
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        sender: { select: this.userSelect },
        replyTo: { include: { sender: { select: this.userSelect } } },
        reactions: { include: { user: { select: this.userSelect } } },
      },
    });

    return { message: MESSAGES.CHAT.MESSAGE_EDITED, data: updated };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException(MESSAGES.CHAT.MESSAGE_NOT_FOUND);
    if (message.senderId !== userId) {
      throw new ForbiddenException(MESSAGES.CHAT.NOT_MESSAGE_OWNER);
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null },
    });

    return {
      message: MESSAGES.CHAT.MESSAGE_DELETED,
      data: { id: messageId, roomId: message.roomId },
    };
  }

  async searchMessages(
    userId: string,
    keyword: string,
    roomId?: string,
    pagination?: PaginationDto,
  ) {
    const userRooms = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });

    const roomIds = roomId ? [roomId] : userRooms.map((m) => m.roomId);

    const where = {
      roomId: { in: roomIds },
      isDeleted: false,
      content: { contains: keyword, mode: 'insensitive' as const },
    };

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        include: {
          sender: { select: this.userSelect },
          room: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination?.skip ?? 0,
        take: pagination?.limit ?? 20,
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    return {
      message: MESSAGES.CHAT.SEARCH_RESULTS,
      data: messages,
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (pagination?.limit ?? 20)),
      },
    };
  }

  // ================== REACTIONS ==================

  async addReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException(MESSAGES.CHAT.MESSAGE_NOT_FOUND);

    await this.assertMembership(message.roomId, userId);

    const reaction = await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
      create: { messageId, userId, emoji },
      update: {},
      include: { user: { select: this.userSelect } },
    });

    return { ...reaction, roomId: message.roomId };
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException(MESSAGES.CHAT.MESSAGE_NOT_FOUND);

    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });

    return { messageId, userId, emoji, roomId: message.roomId };
  }

  // ================== MARK READ ==================

  async markAsRead(userId: string, roomId: string) {
    await this.prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { roomId, userId, readAt: new Date() };
  }

  // ================== ONLINE STATUS ==================

  async getRoomMemberIds(roomId: string): Promise<string[]> {
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async getPublicRooms(pagination: PaginationDto) {
    const where = { type: ChatRoomType.PUBLIC };

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          createdBy: { select: this.userSelect },
          _count: { select: { messages: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return {
      message: MESSAGES.CHAT.ROOMS_LISTED,
      data: rooms,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / (pagination.limit ?? 10)),
      },
    };
  }

  async joinPublicRoom(userId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) throw new NotFoundException(MESSAGES.CHAT.ROOM_NOT_FOUND);
    if (room.type !== ChatRoomType.PUBLIC) {
      throw new BadRequestException(MESSAGES.CHAT.NOT_PUBLIC_ROOM);
    }

    const existing = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      throw new BadRequestException(MESSAGES.CHAT.ALREADY_MEMBER);
    }

    await this.prisma.chatRoomMember.create({
      data: { roomId, userId, role: ChatMemberRole.MEMBER },
    });

    return { message: MESSAGES.CHAT.JOINED_ROOM };
  }

  // ================== HELPERS ==================

  private readonly userSelect = {
    id: true,
    email: true,
    fullName: true,
    role: true,
  } as const;

  private async assertMembership(roomId: string, userId: string) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ForbiddenException(MESSAGES.CHAT.NOT_A_MEMBER);
  }

  private async assertMemberRole(
    roomId: string,
    userId: string,
    allowedRoles: ChatMemberRole[],
  ) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ForbiddenException(MESSAGES.CHAT.NOT_A_MEMBER);
    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException(MESSAGES.CHAT.INSUFFICIENT_ROLE);
    }
  }
}
