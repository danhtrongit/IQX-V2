import { Module } from '@nestjs/common';
import { AiNewsController } from './ai-news.controller';
import { AiNewsService } from './ai-news.service';
import { RedisCacheModule } from '../../common/modules/redis-cache';

@Module({
  imports: [RedisCacheModule],
  controllers: [AiNewsController],
  providers: [AiNewsService],
  exports: [AiNewsService],
})
export class AiNewsModule {}
