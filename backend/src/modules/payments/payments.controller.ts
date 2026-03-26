import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Thanh toán')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Xem danh sách gói Premium' })
  getPlans() {
    return this.paymentsService.getPlans();
  }

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo đơn thanh toán nâng cấp Premium' })
  createCheckout(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckout(userId, dto);
  }

  @Post('ipn')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook nhận thông báo thanh toán từ SePay (IPN)' })
  handleIpn(@Body() body: any) {
    return this.paymentsService.handleIpn(body);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử thanh toán' })
  getHistory(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getHistory(userId, pagination);
  }
}
