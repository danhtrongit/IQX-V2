import { Module } from '@nestjs/common';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';
import { InsightDataCollector } from './insight-data-collector.service';
import { AiNewsModule } from '../ai-news/ai-news.module';
import { CompanyModule } from '../company/company.module';
import { QuoteModule } from '../quote/quote.module';
import { TradingModule } from '../trading/trading.module';
import { RedisCacheModule } from '../../common/modules/redis-cache';

@Module({
  imports: [AiNewsModule, CompanyModule, QuoteModule, TradingModule, RedisCacheModule],
  controllers: [AiInsightController],
  providers: [AiInsightService, InsightDataCollector],
  exports: [AiInsightService],
})
export class AiInsightModule {}

