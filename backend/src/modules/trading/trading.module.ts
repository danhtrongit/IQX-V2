import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../../common/modules/redis-cache';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  imports: [RedisCacheModule],
  controllers: [TradingController],
  providers: [TradingService, MarketDataGateway],
  exports: [TradingService],
})
export class TradingModule {}
