import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const toUpperTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class GetAllocatedIcbDto {
  @ApiProperty({
    description: 'Nhóm thị trường cần lấy phân bổ ICB',
    example: 'HOSE',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'group không được để trống' })
  group: string;

  @ApiProperty({
    description: 'Khung thời gian thống kê',
    example: 'ONE_WEEK',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'timeFrame không được để trống' })
  timeFrame: string;
}

export class GetAllocatedIcbDetailDto extends GetAllocatedIcbDto {
  @ApiProperty({
    description: 'Mã ICB cần lấy chi tiết',
    example: 2700,
  })
  @Type(() => Number)
  @IsInt({ message: 'icbCode phải là số nguyên' })
  @Min(1, { message: 'icbCode phải lớn hơn 0' })
  icbCode: number;
}
