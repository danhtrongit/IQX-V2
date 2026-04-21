import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ================== ROOMS ==================

  @Post('rooms')
  @ApiOperation({ summary: 'Tạo phòng chat mới' })
  createRoom(@CurrentUser('sub') userId: string, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(userId, dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Danh sách phòng chat của tôi' })
  getMyRooms(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getUserRooms(userId, pagination);
  }

  @Get('rooms/public')
  @ApiOperation({ summary: 'Danh sách phòng chat công khai' })
  getPublicRooms(@Query() pagination: PaginationDto) {
    return this.chatService.getPublicRooms(pagination);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Chi tiết phòng chat' })
  getRoomById(@CurrentUser('sub') userId: string, @Param('id') roomId: string) {
    return this.chatService.getRoomById(userId, roomId);
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Cập nhật phòng chat (Owner/Admin)' })
  updateRoom(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.chatService.updateRoom(userId, roomId, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa phòng chat (Owner only)' })
  deleteRoom(@CurrentUser('sub') userId: string, @Param('id') roomId: string) {
    return this.chatService.deleteRoom(userId, roomId);
  }

  @Post('rooms/direct/:targetUserId')
  @ApiOperation({ summary: 'Tạo/lấy phòng chat riêng (DM) với user khác' })
  getOrCreateDirect(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.getOrCreateDirectRoom(userId, targetUserId);
  }

  @Post('rooms/:id/join')
  @ApiOperation({ summary: 'Tham gia phòng chat công khai' })
  joinPublicRoom(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
  ) {
    return this.chatService.joinPublicRoom(userId, roomId);
  }

  // ================== MEMBERS ==================

  @Post('rooms/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào phòng (Owner/Admin)' })
  addMembers(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.chatService.addMembers(userId, roomId, dto.userIds);
  }

  @Delete('rooms/:id/members/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa thành viên / Rời phòng' })
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.removeMember(userId, roomId, targetUserId);
  }

  // ================== MESSAGES ==================

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: 'Lịch sử tin nhắn trong phòng' })
  getMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(userId, roomId, pagination);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Chỉnh sửa tin nhắn (chỉ người gửi)' })
  editMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') messageId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(userId, messageId, content);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tin nhắn (chỉ người gửi)' })
  deleteMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.chatService.deleteMessage(userId, messageId);
  }

  // ================== SEARCH ==================

  @Get('messages/search')
  @ApiOperation({ summary: 'Tìm kiếm tin nhắn' })
  searchMessages(
    @CurrentUser('sub') userId: string,
    @Query() dto: SearchMessagesDto,
  ) {
    return this.chatService.searchMessages(
      userId,
      dto.keyword,
      dto.roomId,
      dto,
    );
  }
}
