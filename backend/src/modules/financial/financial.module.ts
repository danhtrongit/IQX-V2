import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { RedisCacheModule } from '../../common/modules/redis-cache';

@Module({
  imports: [RedisCacheModule],
  controllers: [FinancialController],
  providers: [FinancialService],
})
export class FinancialModule {}
