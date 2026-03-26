import { Module } from '@nestjs/common';
import { AiNewsController } from './ai-news.controller';
import { AiNewsService } from './ai-news.service';

@Module({
  controllers: [AiNewsController],
  providers: [AiNewsService],
  exports: [AiNewsService],
})
export class AiNewsModule {}
