import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('💬 Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userEmail = payload.email;

      // Track online status
      if (!this.onlineUsers.has(client.userId)) {
        this.onlineUsers.set(client.userId, new Set());
      }
      this.onlineUsers.get(client.userId)!.add(client.id);

      // Broadcast online status
      this.server.emit('user_online', {
        userId: client.userId,
        onlineAt: new Date(),
      });

      this.logger.log(`✅ User connected: ${client.userEmail} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const sockets = this.onlineUsers.get(client.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(client.userId);
        this.server.emit('user_offline', {
          userId: client.userId,
          offlineAt: new Date(),
        });
      }
    }

    this.logger.log(`❌ User disconnected: ${client.userEmail || client.id}`);
  }

  // ================== ROOM EVENTS ==================

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.assertAuth(client);

    client.join(`room:${data.roomId}`);

    this.server.to(`room:${data.roomId}`).emit('user_joined_room', {
      userId: client.userId,
      roomId: data.roomId,
      joinedAt: new Date(),
    });

    return { event: 'joined', roomId: data.roomId };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.assertAuth(client);

    client.leave(`room:${data.roomId}`);

    this.server.to(`room:${data.roomId}`).emit('user_left_room', {
      userId: client.userId,
      roomId: data.roomId,
      leftAt: new Date(),
    });

    return { event: 'left', roomId: data.roomId };
  }

  // ================== MESSAGE EVENTS ==================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      content?: string;
      type?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyToId?: string;
    },
  ) {
    this.assertAuth(client);

    try {
      const message = await this.chatService.sendMessage(
        client.userId,
        data.roomId,
        {
          content: data.content,
          type: data.type as any,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          replyToId: data.replyToId,
        },
      );

      this.server.to(`room:${data.roomId}`).emit('new_message', message);

      // Notify offline room members (not in the socket room)
      const memberIds = await this.chatService.getRoomMemberIds(data.roomId);
      for (const memberId of memberIds) {
        if (memberId === client.userId) continue;

        const sockets = this.onlineUsers.get(memberId);
        if (sockets) {
          for (const socketId of sockets) {
            this.server.to(socketId).emit('notification', {
              type: 'new_message',
              roomId: data.roomId,
              message,
            });
          }
        }
      }

      return message;
    } catch (error) {
      throw new WsException(error.message || 'Gửi tin nhắn thất bại');
    }
  }

  // ================== TYPING EVENTS ==================

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.assertAuth(client);

    client.to(`room:${data.roomId}`).emit('typing', {
      userId: client.userId,
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.assertAuth(client);

    client.to(`room:${data.roomId}`).emit('stop_typing', {
      userId: client.userId,
      roomId: data.roomId,
    });
  }

  // ================== READ RECEIPTS ==================

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.assertAuth(client);

    try {
      const result = await this.chatService.markAsRead(
        client.userId,
        data.roomId,
      );

      this.server.to(`room:${data.roomId}`).emit('message_read', {
        userId: client.userId,
        roomId: data.roomId,
        readAt: result.readAt,
      });

      return result;
    } catch (error) {
      throw new WsException(error.message || 'Đánh dấu đã đọc thất bại');
    }
  }

  // ================== REACTIONS ==================

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    this.assertAuth(client);

    try {
      const reaction = await this.chatService.addReaction(
        client.userId,
        data.messageId,
        data.emoji,
      );

      this.server
        .to(`room:${reaction.roomId}`)
        .emit('reaction_added', reaction);

      return reaction;
    } catch (error) {
      throw new WsException(error.message || 'Thêm reaction thất bại');
    }
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    this.assertAuth(client);

    try {
      const result = await this.chatService.removeReaction(
        client.userId,
        data.messageId,
        data.emoji,
      );

      this.server.to(`room:${result.roomId}`).emit('reaction_removed', result);

      return result;
    } catch (error) {
      throw new WsException(error.message || 'Xóa reaction thất bại');
    }
  }

  // ================== EDIT / DELETE via WS ==================

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    this.assertAuth(client);

    try {
      const result = await this.chatService.editMessage(
        client.userId,
        data.messageId,
        data.content,
      );

      this.server
        .to(`room:${result.data.roomId}`)
        .emit('message_edited', result.data);

      return result;
    } catch (error) {
      throw new WsException(error.message || 'Chỉnh sửa tin nhắn thất bại');
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    this.assertAuth(client);

    try {
      const result = await this.chatService.deleteMessage(
        client.userId,
        data.messageId,
      );

      this.server
        .to(`room:${result.data.roomId}`)
        .emit('message_deleted', result.data);

      return result;
    } catch (error) {
      throw new WsException(error.message || 'Xóa tin nhắn thất bại');
    }
  }

  // ================== ONLINE STATUS ==================

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('online_users', {
      data: Array.from(this.onlineUsers.keys()),
    });
  }

  // ================== HELPERS ==================

  private assertAuth(client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new WsException('Unauthorized');
    }
  }
}
