import { Module } from '@nestjs/common';
import { AiDashboardController } from './ai-dashboard.controller';
import { AiDashboardService } from './ai-dashboard.service';
import { TradingModule } from '../trading/trading.module';
import { RedisCacheModule } from '../../common/modules/redis-cache';

@Module({
  imports: [TradingModule, RedisCacheModule],
  controllers: [AiDashboardController],
  providers: [AiDashboardService],
  exports: [AiDashboardService],
})
export class AiDashboardModule {}
