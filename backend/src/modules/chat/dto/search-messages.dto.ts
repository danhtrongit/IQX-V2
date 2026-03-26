import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchMessagesDto extends PaginationDto {
  @ApiProperty({ description: 'Từ khóa tìm kiếm', example: 'VN30' })
  @IsString()
  @MinLength(2)
  keyword: string;

  @ApiPropertyOptional({ description: 'Giới hạn tìm trong phòng' })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}
