import { Module } from '@nestjs/common';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  controllers: [TradingController],
  providers: [TradingService, MarketDataGateway],
  exports: [TradingService],
})
export class TradingModule {}
