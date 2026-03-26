import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Gói đăng ký Premium',
    enum: SubscriptionPlan,
    example: 'MONTHLY',
    enumName: 'SubscriptionPlan',
  })
  @IsEnum(SubscriptionPlan, {
    message:
      'Gói đăng ký không hợp lệ. Chọn: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL',
  })
  @IsNotEmpty({ message: 'Gói đăng ký không được để trống' })
  plan: SubscriptionPlan;
}
