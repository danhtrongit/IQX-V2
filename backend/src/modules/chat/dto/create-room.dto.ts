import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

enum CreateRoomType {
  GROUP = 'GROUP',
  PUBLIC = 'PUBLIC',
}

export class CreateRoomDto {
  @ApiProperty({ description: 'Tên phòng chat', example: 'Nhóm cổ phiếu VN30' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả phòng chat' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CreateRoomType, default: 'GROUP' })
  @IsOptional()
  @IsEnum(CreateRoomType)
  type?: CreateRoomType = CreateRoomType.GROUP;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Danh sách user ID thêm vào phòng',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  memberIds?: string[];
}
