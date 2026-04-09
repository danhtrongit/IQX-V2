import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const toUpperTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
};

export class GetAllSectorSignalsDto {
  @ApiProperty({
    description: 'Nhóm thị trường cần phân loại dòng tiền/ngành',
    example: 'HOSE',
  })
  @Transform(toUpperTrimmed)
  @IsString()
  @IsNotEmpty({ message: 'group không được để trống' })
  group: string;

  @ApiPropertyOptional({
    description:
      'Có áp dụng giới hạn TOP theo nhãn hay không (Dẫn sóng: top 1, Hút tiền: top 2, Tích lũy: top 3). Mặc định = true',
    example: false,
    default: true,
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'applyTopLimit phải là true hoặc false' })
  applyTopLimit?: boolean;

  @ApiPropertyOptional({
    description:
      'Bật debug để trả thêm toàn bộ dữ liệu đầu vào ngành level 1-2 theo file icb-codes.json',
    example: true,
    default: false,
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'debug phải là true hoặc false' })
  debug?: boolean;
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
