import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const toUpperTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class GetSectorAnalysisDto {
  @ApiProperty({
    description: 'Nhóm thị trường (VD: HOSE, HNX, UPCOM)',
    example: 'HOSE',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'group không được để trống' })
  group: string;

  @ApiProperty({
    description: 'Mã ngành ICB cần phân tích',
    example: 2700,
  })
  @Type(() => Number)
  @IsInt({ message: 'icbCode phải là số nguyên' })
  @Min(1, { message: 'icbCode phải lớn hơn 0' })
  icbCode: number;
}

export class GetAllSectorAnalysisDto {
  @ApiProperty({
    description: 'Nhóm thị trường (VD: HOSE, HNX, UPCOM)',
    example: 'HOSE',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'group không được để trống' })
  group: string;
}
