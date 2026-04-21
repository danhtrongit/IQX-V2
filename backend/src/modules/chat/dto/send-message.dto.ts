import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

enum SendMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'Nội dung tin nhắn',
    example: 'Xin chào!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ enum: SendMessageType, default: 'TEXT' })
  @IsOptional()
  @IsEnum(SendMessageType)
  type?: SendMessageType = SendMessageType.TEXT;

  @ApiPropertyOptional({ description: 'URL file đính kèm' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Tên file' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Kích thước file (bytes)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'ID tin nhắn reply' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
