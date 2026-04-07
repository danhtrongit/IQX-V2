import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const toUpperTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class GetAllSectorSignalsDto {
  @ApiProperty({
    description: 'Nhóm thị trường cần phân loại dòng tiền/ngành',
    example: 'HOSE',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'group không được để trống' })
  group: string;
}

export class GetSectorSignalDto extends GetAllSectorSignalsDto {
  @ApiProperty({
    description: 'Mã ngành ICB cần phân loại',
    example: 2700,
  })
  @Type(() => Number)
  @IsInt({ message: 'icb_code phải là số nguyên' })
  @Min(1, { message: 'icb_code phải lớn hơn 0' })
  icb_code: number;

  get icbCode(): number {
    return this.icb_code;
  }
}
